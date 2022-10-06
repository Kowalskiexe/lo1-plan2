import { Schedule } from 'lo1-plan2-common';

const serverURL = 'localhost:3333';

const fetchSchedule = async (className: string) => {
    const response = await fetch(`http://${serverURL}/schedule/${className}`);
    const json: Schedule = await response.json();
    console.log(json);
};

fetchSchedule('3DG');

