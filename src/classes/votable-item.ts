import { Object, Property, } from 'fabric-contract-api';

@Object()
export class VotableItem {

    @Property()
    public id: string;

    @Property()
    public electionId: string;

    @Property()
    public firstName: string;

    @Property()
    public lastName: string;

    @Property()
    public imageUrl: string;

    @Property()
    public voteCount: number;

    @Property()
    public type: string;

    constructor(votableId: string, electionId: string, firstName: string, lastName: string, imageUrl: string) {
        this.id = votableId
        this.electionId = electionId
        this.firstName = firstName
        this.lastName = lastName
        this.imageUrl = imageUrl
        this.voteCount = 0
        this.type = 'votable'
    }

}
