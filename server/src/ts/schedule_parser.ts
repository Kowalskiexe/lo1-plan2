import { Schedule, Duration, Lesson } from 'lo1-plan2-common';

class ParsingError extends Error {
    constructor(...params: any) {
        super(...params);
        this.name = 'ParsingError';
    }
};

export { ParsingError };

export default class ScheduleParser {
    parseClassesAndAddresses(raw: string): [string, string][] {
        const rowReg = /href=".*<\/a>/g;
        const rows = raw.match(rowReg);
        if (!rows)
            throw new ParsingError('no classes found');
        const result: [string, string][] = rows.map((x: string) => {
            const fileReg = /plany\/o\d*\.html/;
            const classReg = />\d+[a-zA-Z]+</;
            const fileMatch = x.match(fileReg);
            const classMatch = x.match(classReg);
            if (!fileMatch || !classMatch)
                throw new Error('An error occured during finding classes and file names. A class name or a file name is missing.');
            const file = fileMatch.toString();
            let className = classMatch.toString();
            className = className.substring(1, className.length - 1);
            return [className, file];
        });
        return result;
    }

    getOpeningTagReg(tag: string, flags?: string): RegExp {
        return new RegExp(`<${tag}[^<]*>`, flags);
    }

    findOpeningTag(tag: string, n: number, html: string): RegExpMatchArray {
        const reg: RegExp = this.getOpeningTagReg(tag, 'g');
        const matches = [...html.matchAll(reg)];
        if (!matches)
            throw new ParsingError(`no ${tag} opening tags`);
        if (matches[n])
            return matches[n];
        else
            throw new ParsingError(`no ${n}th ${tag} opening tag (all matches: ${matches.toString()}`); // known bug: 1th, 2th, 3th
    }

    findClosingTag(tag: string, n: number, html: string): RegExpMatchArray {
        const reg: RegExp = new RegExp(`</${tag}>`, 'g');
        const matches = [...html.matchAll(reg)];
        if (!matches)
            throw new ParsingError(`no ${tag} closing tags`);
        if (matches[n])
            return matches[n];
        else
            throw new ParsingError(`no ${n}th ${tag} closing tag (all matches: ${matches.toString()}`); // known bug: 1th, 2th, 3th
    }

    parseClassSchedule(raw: string): Schedule {
        // extracting table with schedule
        const openingTableTag = this.findOpeningTag('table', 2, raw);
        if (!openingTableTag)
            throw new ParsingError('no opening third table tag found');
        let startIndex = openingTableTag.index ? openingTableTag.index : 0;
        startIndex += openingTableTag.toString().length;
        raw = raw.substring(startIndex);
        raw = raw.trim();

        const closingTableTag = this.findClosingTag('table', 0, raw);
        if (!closingTableTag)
            throw new ParsingError('no closing table tag found');
        const endIndex = closingTableTag.index ? closingTableTag.index : raw.length;
        raw = raw.substring(0, endIndex);
        raw = raw.trim();

        // parse table 
        let rows: string[] = raw.split('</tr>');
        rows = rows.map(x => x.trim().substring('<tr>'.length).trim())
        rows = rows.filter((_: string, index: number) => index != 0); // remove headers

        let stringSchedule: string[][] = rows.map(i => i.split(/<\/td>/));
        stringSchedule = stringSchedule.map((i: string[]) => i.map(j => j.trim()));
        stringSchedule = stringSchedule.map((i: string[]) => i.filter(j => j != ''));
        stringSchedule = stringSchedule.filter((i: string[]) => i.length != 0);

        let stringDurations: string[] = stringSchedule.map((i: string[]) => i[1]); // durations are contained in the second column
        stringDurations = stringDurations.map((i: string) => i.substring('<td>'.length)); // remove <td> tag
        const durations: Duration[] = stringDurations.map((i: string) => {
            const start = i.substring(0, '00:00'.length).trim();
            const end = i.substring('00:00-'.length).trim();
            return { start, end };
        })

        // remove the first and the second column containg lessons' number and durations
        stringSchedule = stringSchedule.map((i: string[]) => i.filter((_: string, index: number) => index > 1));
        // remove <td ... > tag
        stringSchedule = stringSchedule.map((i: string[]) => i.map((j: string) => j.replace(this.getOpeningTagReg('td'), '')));
        // replace '&nbsp;' with ''
        stringSchedule = stringSchedule.map((i: string[]) => i.map((j: string) => j == '&nbsp;' ? '' : j));

        // example: <span class="p">j.polski</span>
        // because of the way teacher's field is filled, this must not contain '#'
        const subjectReg = new RegExp('(?<=<span class="p">)[^<#]*(?=<\/span>)', 'g');
        // example: <span class="n">RF</span>
        // exmaple: <span class="p">#h31</span> <- this counts as a teacher somehow, or at least sits in its place whatever it means
        const teacherReg = new RegExp('(?<=<span class="n">)[^<]*(?=<\/span>)|(?<=<span class="p">)[^<]*#[^<]*(?=<\/span>)', 'g');
        // example: <span class="s">46</span>
        const classroomReg = new RegExp('(?<=<span class="s">)[^<]*(?=<\/span>)', 'g');

        // first index - lesson's hourSlot
        // second index - day of the week, Monday is 0, Friday is 4
        // third index - concurrent lesson's number. There may be multiple lessons at the same time for different groups in the same class
        const lessonsSchedule: Lesson[][][] = stringSchedule.map((row: string[], hourSlot: number) =>
            row.map((lessonString: string) => {
                const subjects = lessonString.match(subjectReg);
                const teachers = lessonString.match(teacherReg);
                const classrooms = lessonString.match(classroomReg);
                if (!subjects || !teachers || !classrooms) // no lesson at that time
                    return [Lesson.createEmpty(hourSlot)];
                const lessons = subjects.map((sub: string, idx: number) => {
                    return new Lesson(hourSlot, sub, teachers[idx], classrooms[idx]);
                });
                return lessons;
            }
            ));

        // first index - day of the week, from 0 - Monday to 4 - Friday
        // second index - hourSlot
        // third index - concurrent lesson's number
        const transformed: Lesson[][][] = lessonsSchedule[0].map((_: Lesson[], day: number) =>
            lessonsSchedule.map((row: Lesson[][]) => row[day]
            ));

        // remove empty lessons
        const filtered: Lesson[][][] = transformed.map((column: Lesson[][]) =>
            column.filter((lesson: Lesson[]) => lesson[0].subject !== ''
            ));

        return { durations, schedule: filtered };
    }
}
