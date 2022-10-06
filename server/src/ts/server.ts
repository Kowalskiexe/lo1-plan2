import express from 'express';
import { Schedule } from 'lo1-plan2-common';
import ScheduleScraper from './schedule_scraper.js';

export default class Server {
    #app = express();

    schedules = new Map<string, Schedule>();

    getClasses(): string[] {
        return Array.from(this.schedules.keys());
    }

    refreshTimeThreshold = 3 * 60 * 60 * 1000; // rescrape schedules if cached data is 3 hours stale 
    #lastUpdateTimestamp = 0;
    get lastUpdateTimestamp() {
        return this.#lastUpdateTimestamp;
    }

    #port: number = 3333;
    get port() {
        return this.#port;
    }

    // TODO: version checking, perhaps by hashing

    async updateCache() {
        const scraper: ScheduleScraper = new ScheduleScraper();
        const classesAndAddresses = await scraper.getClassesAndAddresses();
        const classes = classesAndAddresses.map(i => i[0]);
        const paths = classesAndAddresses.map(i => i[1]);
        const schedulesPromises = paths.map(async (path: string, idx: number) => 
            [classes[idx], await scraper.getClassSchedule(path)] as [string, Schedule]
        );
        const schedulesResolved = await Promise.all(schedulesPromises);
        this.schedules = new Map(schedulesResolved);
        
        this.#lastUpdateTimestamp = Date.now();
    }

    async run(port: number = this.#port) {
        this.#port = port;
        await this.updateCache();

        this.#app.get('/', (_, res) => {
            res.send('<h1>Welcome</h1>\
            <p>server is up & running</p>\
            <p>use /list to get list of the all classes</p>\
            <p>use /schedule/CLASS_NAME to get the schedule of the class supplied in the URL</p>');
        });

        // cache refreshing middleware
        this.#app.use((req, res, next) => {
            if (Date.now() - this.lastUpdateTimestamp >= this.refreshTimeThreshold)
                this.updateCache();
            next();
        });

        this.#app.get('/list', (_, res) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.json(this.getClasses());
        });

        this.#app.get(`/schedule/:className`, (req, res) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.json(this.schedules.get(req.params.className));
        });

        this.#app.listen(port, () => {
            console.log('server up & running');
        });
    }
}
