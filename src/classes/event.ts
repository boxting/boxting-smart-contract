import { Object, Property, } from 'fabric-contract-api';

@Object()
export class Event {

    @Property()
    public id: string;

    @Property()
    public startDate: string;

    @Property()
    public endDate: string;

    @Property()
    public type: string;

    constructor(eventId: string, startDate: string, endDate: string) {
        this.id = eventId
        this.startDate = startDate
        this.endDate = endDate
        this.type = 'event'
    }

}
