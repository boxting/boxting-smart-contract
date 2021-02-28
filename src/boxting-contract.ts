import { Context, Contract, Info, Returns, Transaction } from "fabric-contract-api";
import { Election } from "./classes/election";
import { Event } from "./classes/event";
import { VotableItem } from "./classes/votable-item";
import { Vote } from "./classes/vote";
import { Voter } from "./classes/voter";
import { InitData, VoterData, JsonResponse } from "./interfaces/interfaces";

@Info({ title: 'BoxtingContract', description: 'Smart contract for boxting voting solution.' })
export class BoxtingContract extends Contract {

    /**
     * Set the initial data of the contract, this transaction can only be executed once.
     * 
     * @param {Context} ctx the transaction context
     * @param {InitData} initData the inital data containing the event, the elections and the candidates
     * 
     * @returns {boolean} true if the init is successfully accomplished
     */
    @Transaction()
    @Returns('boolean')
    public async initContract(ctx: Context, initDataStr: string): Promise<boolean> {

        console.log('Init contract method called')

        const initData: InitData = JSON.parse(initDataStr)

        // Validate if an event already exists, meaning contract was already initiated
        const existingEvent: Event[] = JSON.parse(await this.queryByObjectType(ctx, 'event'));

        if (existingEvent && existingEvent.length > 0) {
            throw new Error('The boxting contract has already been initiated');
        }

        // Create the new Event
        let eventData = initData.event
        let event = new Event(eventData.id, eventData.startDate, eventData.endDate)
        let eventBuffer: Buffer = Buffer.from(JSON.stringify(event))

        await ctx.stub.putState(`event-${event.id}`, eventBuffer)

        // Create the elections
        let electionList = initData.elections

        electionList.forEach(async (elem) => {

            let election = new Election(
                elem.id, elem.eventId,
                elem.electionType, elem.maxVotes
            )

            let electionBuffer: Buffer = Buffer.from(JSON.stringify(election))
            await ctx.stub.putState(`election-${election.id}`, electionBuffer)
        });

        // Create the candidates
        let candidateList = initData.candidates

        candidateList.forEach(async (elem) => {

            let candidate = new VotableItem(
                elem.id, elem.electionId,
                elem.firstName, elem.lastName,
                elem.imageUrl
            )

            let candidateBuffer: Buffer = Buffer.from(JSON.stringify(candidate))
            await ctx.stub.putState(`candidate-${candidate.id}`, candidateBuffer)
        });

        return true
    }


    /**
     * Creates a new user for the contract
     * 
     * @param {Context} ctx the transaction context
     * @param {VoterData} voterData the data of the voter including the dni as id, first and last name
     * 
     * @returns {boolean} true if the creation is successfully accomplished
     */
    @Transaction()
    @Returns('boolean')
    public async createVoter(ctx: Context, voterDataStr: string): Promise<boolean> {

        const voterData: VoterData = JSON.parse(voterDataStr)

        // Check if a user with the same id is already registered
        const data: Uint8Array = await ctx.stub.getState(`voter-${voterData.id}`)

        if (!!data && data.length > 0) {
            throw new Error(`A voter with the id ${voterData.id} already exists`)
        }

        const voter = new Voter(voterData.id, voterData.firstName, voterData.lastName)
        const voterBuffer: Buffer = Buffer.from(JSON.stringify(voter))

        await ctx.stub.putState(`voter-${voter.id}`, voterBuffer)

        return true
    }


    /**
     * Get the information of a specific candidate
     * 
     * @param {Context} ctx the transaction context
     * @param {string} candidateId the id of the candidate you want the get the information
     * 
     * @returns {string} Returns the candidate data as a json string
     */
    @Transaction(false)
    @Returns('string')
    public async readCandidate(ctx: Context, candidateId: string): Promise<string> {

        // Validate init
        const event = await this.validateInit(ctx)

        // Check if a candidate with the id exists
        const data: Uint8Array = await ctx.stub.getState(`candidate-${candidateId}`)
        const exists: boolean = (!!data && data.length > 0)

        if (!exists) {
            throw new Error(`A candidate with the id ${candidateId} does not exists`)
        }

        // Check if event has finished
        const endDate = new Date(event.endDate)
        const currentDate = Date.now()

        if (currentDate < endDate.getTime()) {
            throw new Error('The event has not finished yet, cannot get results')
        }

        const candidate = data.toString();

        return candidate;
    }


    /**
     * Get the results of an specific election
     * 
     * @param {Context} ctx the transaction context
     * @param electionId 
     * 
     * @returns a list containing all candidates that participated on the election as a string
     */
    @Transaction(false)
    @Returns('string')
    public async getElectionResults(ctx: Context, electionId: string): Promise<string> {

        // Validate init
        const event = await this.validateInit(ctx)

        // Check if election exists
        const electionExists: boolean = await this.checkIfExists(ctx, `election-${electionId}`)

        if (!electionExists) {
            throw new Error(`The election ${electionId} does not exists`)
        }

        // Check if event has finished
        const endDate = new Date(event.endDate)
        const currentDate = Date.now()

        if (currentDate < endDate.getTime()) {
            throw new Error('The event has not finished yet, cannot get results')
        }

        // Create query to get the candidates
        const queryString = {
            selector: {
                electionId: electionId,
                type: 'votable'
            }
        };

        // Get the results
        const candidates = await this.queryWithQueryString(ctx, JSON.stringify(queryString));

        return candidates
    }


    /**
     * Transaction to get the vote of a user on a specific election
     * 
     * @param {Context} ctx the transaction context
     * @param {string} electionId the id of the election 
     * @param {string} voterId the id of the voter
     * 
     * @returns the vote object including a list of the selected candidates for the election.
     */
    @Transaction(false)
    @Returns('string')
    public async readVote(ctx: Context, electionId: string, voterId: string): Promise<string> {

        // Validate init
        await this.validateInit(ctx)

        // Check if election with the id exists
        const electionExist: boolean = await this.checkIfExists(ctx, `election-${electionId}`)
        if (!electionExist) {
            throw new Error(`The election ${electionId} does not exists`);
        }

        // Check if voter with the id exists
        const voterExist: boolean = await this.checkIfExists(ctx, `voter-${voterId}`)
        if (!voterExist) {
            throw new Error(`The voter ${voterId} does not exists`);
        }

        // Get the voter
        const voterData: Uint8Array = await ctx.stub.getState(`voter-${voterId}`);
        const voter: Voter = JSON.parse(voterData.toString()) as Voter;

        const votedElectionIds = JSON.parse(voter.votedElectionIds)
        if (votedElectionIds.length == 0) {
            throw new Error(`The voter has not voted yet`);
        }

        // Create query to get the vote
        const queryString = {
            selector: {
                electionId: electionId,
                voterId: voterId,
                type: 'vote'
            }
        };

        // Get the results
        const queryResults = await this.queryWithQueryString(ctx, JSON.stringify(queryString));

        const votes: Vote[] = JSON.parse(queryResults)

        if (!votes || votes.length == 0) {
            throw new Error('The voter has not voted yet on this election.')
        }

        return JSON.stringify(votes[0]);
    }


    /**
     * Emit a new vote on a election activity
     * 
     * @param {Context} ctx the transaction context
     * @param {string} electionId the id of the election 
     * @param {string} voterId the id of the voter
     * @param {string} candidateIds the list of candidate ids as a string
     * 
     * @returns {boolean} true if the vote is correctly saved
     */
    @Transaction()
    @Returns('boolean')
    public async emitVote(ctx: Context, electionId: string, voterId: string, candidateIds: string): Promise<boolean> {

        const event = await this.validateInit(ctx)

        // Check if event is avaliable for voting
        const endDate = new Date(event.endDate)
        const startDate = new Date(event.startDate)
        const currentDate = Date.now()

        if (currentDate < startDate.getTime() || currentDate >= endDate.getTime()) {
            throw new Error('The event is not avaliable for voting')
        }

        // Check if election exist
        const electionData: Uint8Array = await ctx.stub.getState(`election-${electionId}`)
        const electionExist: boolean = (!!electionData && electionData.length > 0)

        if (!electionExist) {
            throw new Error(`The election ${electionId} does not exists`);
        }

        // Check if voter exist
        const voterData: Uint8Array = await ctx.stub.getState(`voter-${voterId}`)
        const voterExist = (!!voterData && voterData.length > 0)

        if (!voterExist) {
            throw new Error(`The voter ${voterId} does not exists`)
        }

        // Get the election and voter
        const election: Election = JSON.parse(electionData.toString()) as Election
        const voter: Voter = JSON.parse(voterData.toString()) as Voter

        // Check if the voter has already voted for this election
        const votedElectionIds = JSON.parse(voter.votedElectionIds)
        if (votedElectionIds.indexOf(election.id) != -1) {
            throw new Error(`The voter has already voted for the election ${election.id}`)
        }

        // Parse the candidate list to a votable id list
        const votableIds: string[] = JSON.parse(candidateIds)

        // Check if sent candidates are the same as max candidates
        if (votableIds.length != election.maxVotes) {
            throw new Error(`The number of candidates sent is not the same as the required for the election`)
        }

        // Create a votable list
        const votables: VotableItem[] = []
        for (let i = 0; i < votableIds.length; i++) {

            // Check if a candidate with the id exists
            const data: Uint8Array = await ctx.stub.getState(`candidate-${votableIds[i]}`)
            const exists: boolean = (!!data && data.length > 0)

            if (!exists) {
                throw new Error(`A candidate with the id ${votableIds[i]} does not exists`)
            }

            let votableItem = JSON.parse(data.toString()) as VotableItem

            if (votableItem.electionId != electionId) {
                throw new Error(`A candidate with the id ${votableIds[i]} does not belong to election ${electionId}`)
            }

            votables.push(votableItem)
        }

        /* Vote Execution */
        // Update the voter voted elections with the election id
        votedElectionIds.push(election.id)
        voter.votedElectionIds = JSON.stringify(votedElectionIds)

        await ctx.stub.putState(`voter-${voter.id}`, Buffer.from(JSON.stringify(voter)))

        const strVotables = JSON.stringify(votables)
        // Create new vote
        const vote: Vote = new Vote(
            voter.id,
            election.id,
            strVotables
        )
        await ctx.stub.putState(`vote-${vote.id}`, Buffer.from(JSON.stringify(vote)))

        return true
    }


    /**
     * Check if a voter already emited a vote for specific election
     * 
     * @param {Context} ctx the transaction context
     * @param {string} electionId the id of the election 
     * @param {string} voterId the id of the voter
     * 
     * @returns {boolean} true if the voter already voted, false otherwise
     */
    @Transaction(false)
    @Returns('boolean')
    public async checkVoteElection(ctx: Context, electionId: string, voterId: string): Promise<boolean> {

        // Check if election exist
        const electionData: Uint8Array = await ctx.stub.getState(`election-${electionId}`)
        const electionExist: boolean = (!!electionData && electionData.length > 0)

        if (!electionExist) {
            throw new Error(`The election ${electionId} does not exists`);
        }

        // Check if voter exist
        const voterData: Uint8Array = await ctx.stub.getState(`voter-${voterId}`)
        const voterExist = (!!voterData && voterData.length > 0)

        if (!voterExist) {
            throw new Error(`The voter ${voterId} does not exists`)
        }

        // Get the election and voter
        const election: Election = JSON.parse(electionData.toString()) as Election
        const voter: Voter = JSON.parse(voterData.toString()) as Voter

        // Check if the voter has already voted for this election
        const votedElectionIds = JSON.parse(voter.votedElectionIds)
        if (votedElectionIds.indexOf(election.id) != -1) {
            return true
        }
        return false
    }

    ////// PRIVATE FUNCTIONS //////

    private async validateInit(ctx: Context): Promise<Event> {
        // Validate if an event already exists, meaning contract was already initiated
        const existingEvent: Event[] = JSON.parse(await this.queryByObjectType(ctx, 'event'));

        if (!existingEvent || existingEvent.length == 0) {
            throw new Error('The boxting contract has not been initiated');
        }

        // If initiated, return the current event
        return existingEvent[0]
    }

    private async checkIfExists(ctx: Context, id: string): Promise<boolean> {
        const data: Uint8Array = await ctx.stub.getState(id);
        return (!!data && data.length > 0);
    }

    private async queryWithQueryString(ctx: Context, queryString: string): Promise<string> {

        console.log('Query string');
        console.log(JSON.stringify(queryString));

        let resultsIterator = await ctx.stub.getQueryResult(queryString);

        let allResults = [];

        while (true) {
            let res = await resultsIterator.next();

            if (res.value && res.value.value.toString()) {
                let jsonRes: JsonResponse = {};

                console.log(res.value.value.toString());

                jsonRes.key = res.value.key;

                try {
                    jsonRes.record = JSON.parse(res.value.value.toString());
                } catch (err) {
                    console.log(err);
                    jsonRes.record = res.value.value.toString();
                }

                allResults.push(jsonRes);
            }

            if (res.done) {
                console.log('end of data');
                await resultsIterator.close();
                console.info(allResults);
                console.log(JSON.stringify(allResults));
                return JSON.stringify(allResults);
            }
        }
    }

    private async queryByObjectType(ctx: Context, objectType: string): Promise<string> {

        const queryString = {
            selector: {
                type: objectType
            }
        };

        const queryResults = await this.queryWithQueryString(ctx, JSON.stringify(queryString));

        return queryResults;
    }
}