import { Lesson } from 'lo1-plan2-common';
class ParsingError extends Error {
    constructor(...params) {
        super(...params);
        this.name = 'ParsingError';
    }
}
;
export { ParsingError };
export default class ScheduleParser {
    parseClassesAndAddresses(raw) {
        const rowReg = /href=".*<\/a>/g;
        const rows = raw.match(rowReg);
        if (!rows)
            throw new ParsingError('no classes found');
        const result = rows.map((x) => {
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
    getOpeningTagReg(tag, flags) {
        return new RegExp(`<${tag}[^<]*>`, flags);
    }
    findOpeningTag(tag, n, html) {
        const reg = this.getOpeningTagReg(tag, 'g');
        const matches = [...html.matchAll(reg)];
        if (!matches)
            throw new ParsingError(`no ${tag} opening tags`);
        if (matches[n])
            return matches[n];
        else
            throw new ParsingError(`no ${n}th ${tag} opening tag (all matches: ${matches.toString()}`);
    }
    findClosingTag(tag, n, html) {
        const reg = new RegExp(`</${tag}>`, 'g');
        const matches = [...html.matchAll(reg)];
        if (!matches)
            throw new ParsingError(`no ${tag} closing tags`);
        if (matches[n])
            return matches[n];
        else
            throw new ParsingError(`no ${n}th ${tag} closing tag (all matches: ${matches.toString()}`);
    }
    parseClassSchedule(raw) {
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
        let rows = raw.split('</tr>');
        rows = rows.map(x => x.trim().substring('<tr>'.length).trim());
        rows = rows.filter((_, index) => index != 0);
        let stringSchedule = rows.map(i => i.split(/<\/td>/));
        stringSchedule = stringSchedule.map((i) => i.map(j => j.trim()));
        stringSchedule = stringSchedule.map((i) => i.filter(j => j != ''));
        stringSchedule = stringSchedule.filter((i) => i.length != 0);
        let stringDurations = stringSchedule.map((i) => i[1]);
        stringDurations = stringDurations.map((i) => i.substring('<td>'.length));
        const durations = stringDurations.map((i) => {
            const start = i.substring(0, '00:00'.length).trim();
            const end = i.substring('00:00-'.length).trim();
            return { start, end };
        });
        stringSchedule = stringSchedule.map((i) => i.filter((_, index) => index > 1));
        stringSchedule = stringSchedule.map((i) => i.map((j) => j.replace(this.getOpeningTagReg('td'), '')));
        stringSchedule = stringSchedule.map((i) => i.map((j) => j == '&nbsp;' ? '' : j));
        const subjectReg = new RegExp('(?<=<span class="p">)[^<#]*(?=<\/span>)', 'g');
        const teacherReg = new RegExp('(?<=<span class="n">)[^<]*(?=<\/span>)|(?<=<span class="p">)[^<]*#[^<]*(?=<\/span>)', 'g');
        const classroomReg = new RegExp('(?<=<span class="s">)[^<]*(?=<\/span>)', 'g');
        const lessonsSchedule = stringSchedule.map((row, hourSlot) => row.map((lessonString) => {
            const subjects = lessonString.match(subjectReg);
            const teachers = lessonString.match(teacherReg);
            const classrooms = lessonString.match(classroomReg);
            if (!subjects || !teachers || !classrooms)
                return [Lesson.createEmpty(hourSlot)];
            const lessons = subjects.map((sub, idx) => {
                return new Lesson(hourSlot, sub, teachers[idx], classrooms[idx]);
            });
            return lessons;
        }));
        const transformed = lessonsSchedule[0].map((_, day) => lessonsSchedule.map((row) => row[day]));
        const filtered = transformed.map((column) => column.filter((lesson) => lesson[0].subject !== ''));
        return { durations, schedule: filtered };
    }
}
