import ScheduleParser from './schedule_parser.js';
import axios from 'axios';
import * as xss from 'xss';

export default class ScheduleScraper {

    private readonly parser = new ScheduleParser();

    static readonly ScheduleBaseURL = 'https://lo1.lublin.eu/plan/';

    /**
    * URL pointing to a website containing a list of all classes in the school
    */
    static readonly ScheduleListURL= `${ScheduleScraper.ScheduleBaseURL}lista.html`;

    /**
     * Fetches sanitized, raw HTML from a supplied URL 
     * @param URL URL to a website to fetch from
     * @return HTML as ``string`` from the website provided via ``URL``
     */
    async fetchRawHTML(URL: string): Promise<string> {
        try {
            const raw: string = (await axios.get<string>(URL)).data;
            
            const sanitized: string = xss.filterXSS(raw, {
                onTagAttr: (tag: string, name: string, value: string) => {
                    // allow <span class="p"> (necessary to retrieve info about lessons)
                    if (tag === 'span' && name === 'class' && ['p','n','s'].includes(value))
                        return `${name}="${value}"`;
                    // allow <a href="plany/o1.html" target="plan">3AG</a> (necessayr to retrieve info about files)
                    if (tag === 'a' && name === 'href') {
                        const fileReg = /plany\/o\d+\.html/;
                        const match: string | undefined = value.match(fileReg)?.toString();
                        if (match === value)
                            return `${name}="${value}"`;
                    }
                    return;
                }
            }); // fetching unsanitized html is not allowed
            return sanitized;
        } catch (error) {
            return Promise.reject(error);
        }
    }

    async getClassesAndAddresses(): Promise<[string, string][]> {
        const raw: string = await this.getRawScheduleList();
        const parsed = this.parser.parseClassesAndAddresses(raw);
        return parsed;
    }

    getFileURL(classFileName: string): string {
        return `${ScheduleScraper.ScheduleBaseURL}${classFileName}`;
    }

    async getRawClassSchedule(classFileName: string): Promise<string> {
        return await this.fetchRawHTML(this.getFileURL(classFileName));
    }

    async getClassSchedule(classFileName: string) {
        const raw: string = await this.getRawClassSchedule(classFileName);
        const parsed = this.parser.parseClassSchedule(raw);
        return parsed;
    }
    
    /**
     * Scrapes raw html code from {@linkcode ScheduleScraper.ScheduleListURL} containing a list of classes in the school.
     * @returns website html code at {@linkcode ScheduleScraper.ScheduleListURL}
     */
    async getRawScheduleList(): Promise<string> {
        return await this.fetchRawHTML(ScheduleScraper.ScheduleListURL);
    }
}
