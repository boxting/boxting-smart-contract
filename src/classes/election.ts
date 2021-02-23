import { Object, Property, } from 'fabric-contract-api';

@Object()
export class Election {

    @Property()
    public id: string;

    @Property()
    public eventId: string;

    @Property()
    public electionType: string;

    @Property()
    public type: string;

    @Property()
    public maxVotes: number;

    constructor(electionId: string, eventId: string, electionType: string, maxVotes: number) {
        this.id = electionId
        this.eventId = eventId
        this.electionType = electionType
        this.maxVotes = maxVotes
        this.type = 'election'
    }

}
