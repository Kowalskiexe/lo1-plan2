var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _Server_app, _Server_lastUpdateTimestamp, _Server_port;
import express from 'express';
import ScheduleScraper from './schedule_scraper.js';
export default class Server {
    constructor() {
        _Server_app.set(this, express());
        this.schedules = new Map();
        this.refreshTimeThreshold = 3 * 60 * 60 * 1000;
        _Server_lastUpdateTimestamp.set(this, 0);
        _Server_port.set(this, 3333);
    }
    getClasses() {
        return Array.from(this.schedules.keys());
    }
    get lastUpdateTimestamp() {
        return __classPrivateFieldGet(this, _Server_lastUpdateTimestamp, "f");
    }
    get port() {
        return __classPrivateFieldGet(this, _Server_port, "f");
    }
    updateCache() {
        return __awaiter(this, void 0, void 0, function* () {
            const scraper = new ScheduleScraper();
            const classesAndAddresses = yield scraper.getClassesAndAddresses();
            const classes = classesAndAddresses.map(i => i[0]);
            const paths = classesAndAddresses.map(i => i[1]);
            const schedulesPromises = paths.map((path, idx) => __awaiter(this, void 0, void 0, function* () { return [classes[idx], yield scraper.getClassSchedule(path)]; }));
            const schedulesResolved = yield Promise.all(schedulesPromises);
            this.schedules = new Map(schedulesResolved);
            __classPrivateFieldSet(this, _Server_lastUpdateTimestamp, Date.now(), "f");
        });
    }
    run(port = __classPrivateFieldGet(this, _Server_port, "f")) {
        return __awaiter(this, void 0, void 0, function* () {
            __classPrivateFieldSet(this, _Server_port, port, "f");
            yield this.updateCache();
            __classPrivateFieldGet(this, _Server_app, "f").get('/', (_, res) => {
                res.send('<h1>Welcome</h1>\
            <p>server is up & running</p>\
            <p>use /list to get list of the all classes</p>\
            <p>use /schedule/CLASS_NAME to get the schedule of the class supplied in the URL</p>');
            });
            __classPrivateFieldGet(this, _Server_app, "f").use((req, res, next) => {
                if (Date.now() - this.lastUpdateTimestamp >= this.refreshTimeThreshold)
                    this.updateCache();
                next();
            });
            __classPrivateFieldGet(this, _Server_app, "f").get('/list', (_, res) => {
                res.header('Access-Control-Allow-Origin', '*');
                res.json(this.getClasses());
            });
            __classPrivateFieldGet(this, _Server_app, "f").get(`/schedule/:className`, (req, res) => {
                res.header('Access-Control-Allow-Origin', '*');
                res.json(this.schedules.get(req.params.className));
            });
            __classPrivateFieldGet(this, _Server_app, "f").listen(port, () => {
                console.log('server up & running');
            });
        });
    }
}
_Server_app = new WeakMap(), _Server_lastUpdateTimestamp = new WeakMap(), _Server_port = new WeakMap();
