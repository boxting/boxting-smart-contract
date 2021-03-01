import { Object, Property, } from 'fabric-contract-api';

@Object()
export class Voter {

    @Property()
    public id: string;

    @Property()
    public firstName: string;

    @Property()
    public lastName: string;

    @Property()
    public type: string;

    @Property()
    public votedElectionIds: string;

    constructor(voterId: string, firstName: string, lastName: string) {
        this.id = voterId
        this.firstName = firstName
        this.lastName = lastName
        this.votedElectionIds = '[]'
        this.type = 'voter'
    }

}
