import { Object, Property, } from 'fabric-contract-api';
import { VotableItem } from './votable-item';

@Object()
export class Voter {

    @Property()
    public electionId: string;

    @Property()
    public voterId: string;

    @Property()
    public selectedCandidates: VotableItem[];

    @Property()
    public type: string;

    constructor(voterId: string, electionId: string) {
        this.voterId = voterId
        this.electionId = electionId
        this.selectedCandidates = []
        this.type = 'vote'
    }
}
