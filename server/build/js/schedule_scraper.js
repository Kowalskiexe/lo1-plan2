var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import ScheduleParser from './schedule_parser.js';
import axios from 'axios';
import * as xss from 'xss';
export default class ScheduleScraper {
    constructor() {
        this.parser = new ScheduleParser();
    }
    fetchRawHTML(URL) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const raw = (yield axios.get(URL)).data;
                const sanitized = xss.filterXSS(raw, {
                    onTagAttr: (tag, name, value) => {
                        var _a;
                        if (tag === 'span' && name === 'class' && ['p', 'n', 's'].includes(value))
                            return `${name}="${value}"`;
                        if (tag === 'a' && name === 'href') {
                            const fileReg = /plany\/o\d+\.html/;
                            const match = (_a = value.match(fileReg)) === null || _a === void 0 ? void 0 : _a.toString();
                            if (match === value)
                                return `${name}="${value}"`;
                        }
                        return;
                    }
                });
                return sanitized;
            }
            catch (error) {
                return Promise.reject(error);
            }
        });
    }
    getClassesAndAddresses() {
        return __awaiter(this, void 0, void 0, function* () {
            const raw = yield this.getRawScheduleList();
            const parsed = this.parser.parseClassesAndAddresses(raw);
            return parsed;
        });
    }
    getFileURL(classFileName) {
        return `${ScheduleScraper.ScheduleBaseURL}${classFileName}`;
    }
    getRawClassSchedule(classFileName) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.fetchRawHTML(this.getFileURL(classFileName));
        });
    }
    getClassSchedule(classFileName) {
        return __awaiter(this, void 0, void 0, function* () {
            const raw = yield this.getRawClassSchedule(classFileName);
            const parsed = this.parser.parseClassSchedule(raw);
            return parsed;
        });
    }
    getRawScheduleList() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.fetchRawHTML(ScheduleScraper.ScheduleListURL);
        });
    }
}
ScheduleScraper.ScheduleBaseURL = 'https://lo1.lublin.eu/plan/';
ScheduleScraper.ScheduleListURL = `${ScheduleScraper.ScheduleBaseURL}lista.html`;
