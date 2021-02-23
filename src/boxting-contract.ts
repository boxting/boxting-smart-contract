import { Context, Contract, Info, Returns, Transaction } from "fabric-contract-api";
import { Election } from "./classes/election";
import { Event } from "./classes/event";
import { VotableItem } from "./classes/votable-item";
import { Vote } from "./classes/vote";
import { Voter } from "./classes/voter";
import { InitData, VoterData, JsonResponse } from "./interfaces/interfaces";

@Info({ title: 'BoxtingContract', description: 'Smart contract for boxting voting solution.' })
export class BoxtingContract extends Contract {

    @Transaction()
    @Returns('boolean')
    public async initContract(ctx: Context, initData: InitData): Promise<boolean> {

        console.log('Init contract method called')

        // Validate if an event already exists, meaning contract was already initiated
        const existingEvent: Event[] = JSON.parse(await this.queryByObjectType(ctx, 'election'));

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

    @Transaction()
    @Returns('boolean')
    public async createVoter(ctx: Context, voterData: VoterData): Promise<boolean> {

        // Check if a user with the same id is already registered
        const data: Uint8Array = await ctx.stub.getState(`voter-${voterData.id}`)

        if (!!data && data.length > 0) {
            throw new Error(`A voter with the id ${voterData.id} already exists`)
        }

        let voter = new Voter(voterData.id, voterData.firstName, voterData.lastName)
        let voterBuffer: Buffer = Buffer.from(JSON.stringify(voter))

        await ctx.stub.putState(`voter-${voter.id}`, voterBuffer)

        return true
    }

    @Transaction(false)
    @Returns('VotableItem')
    public async readCandidate(ctx: Context, candidateId: string): Promise<VotableItem> {

        // Check if a candidate with the id exists
        const data: Uint8Array = await ctx.stub.getState(candidateId)
        const exists: boolean = (!!data && data.length > 0)

        if (!exists) {
            throw new Error(`A candidate with the id ${candidateId} does not exists`)
        }

        const candidate: VotableItem = JSON.parse(data.toString()) as VotableItem;
        return candidate;
    }

    @Transaction(false)
    @Returns('Vote')
    public async readVote(ctx: Context, electionId: string, voterId: string): Promise<Vote> {


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

        if (voter.votedElectionIds.length == 0) {
            throw new Error(`The voter has not voted yet`);
        }

        // Create query to get the vote
        const queryString = {
            selector: {
                electionId: electionId,
                voterId: voterId
            }
        };

        // Get the results
        const queryResults = await this.queryWithQueryString(ctx, JSON.stringify(queryString));

        const votes: Vote[] = JSON.parse(queryResults)

        if (!votes || votes.length == 0) {
            throw new Error('The voter has not voted yet on this election.')
        }

        return votes[0];
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