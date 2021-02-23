import { Object, Property, } from 'fabric-contract-api';

@Object()
export class Event {

    @Property()
    public id: string;

    @Property()
    public startDate: Date;

    @Property()
    public endDate: Date;

    @Property()
    public type: string;

    constructor(eventId: string, startDate: string, endDate: string) {
        this.id = eventId
        this.startDate = new Date(startDate)
        this.endDate = new Date(endDate)
        this.type = 'event'
    }

}
