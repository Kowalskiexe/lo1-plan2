export class Lesson {
    hourSlot: number;
    subject: string;
    teacher: string;
    classroom: string;
    constructor(hourSlot: number, subject: string, teacher: string, classroom: string) {
        this.hourSlot = hourSlot;
        this.subject = subject;
        this.teacher = teacher;
        this.classroom = classroom;
    }
    static createEmpty(hourSlot: number) {
        return new Lesson(hourSlot, '', '', '');
    } 
};

export interface Duration {
    start: string;
    end: string;
};

export interface Schedule {
    durations: Duration[];
    schedule: Lesson[][][];
};