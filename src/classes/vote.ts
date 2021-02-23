import { Object, Property, } from 'fabric-contract-api';
import { VotableItem } from './votable-item';

@Object()
export class Vote {

    @Property()
    public id: string

    @Property()
    public electionId: string;

    @Property()
    public voterId: string;

    @Property()
    public selectedCandidates: VotableItem[];

    @Property()
    public type: string;

    constructor(voterId: string, electionId: string, selectedCandidates: VotableItem[]) {
        this.id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        this.voterId = voterId
        this.electionId = electionId
        this.selectedCandidates = selectedCandidates
        this.type = 'vote'
    }
}
