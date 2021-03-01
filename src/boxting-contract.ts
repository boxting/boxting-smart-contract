import { Context, Contract, Info, Returns, Transaction } from "fabric-contract-api"
import { Election } from "./classes/election"
import { Event } from "./classes/event"
import { VotableItem } from "./classes/votable-item"
import { Vote } from "./classes/vote"
import { Voter } from "./classes/voter"
import { BadRequestError } from "./error/bad.request.error"
import { NotFoundError } from "./error/not.found.error"
import { NotPermittedError } from "./error/not.permitted.error"
import { InitData, VoterData, JsonResponse, Result } from "./interfaces/interfaces"

@Info({ title: 'BoxtingContract', description: 'Smart contract for boxting voting solution.' })
export class BoxtingContract extends Contract {

    /**
     * Set the initial data of the contract, this transaction can only be executed once.
     * 
     * @param {Context} ctx the transaction context
     * @param {InitData} initData the inital data containing the event, the elections and the candidates
     * 
     */
    @Transaction()
    @Returns('Result')
    public async initContract(ctx: Context, initDataStr: string): Promise<Result> {

        console.info('Init contract method called.')

        try {
            console.info('Parse init data received.')
            const initData: InitData = JSON.parse(initDataStr)

            // Validate if an event already exists, meaning contract was already initiated
            console.info('Check if an event has already been created.')
            const existingEvent: Event[] = JSON.parse(await this.queryByObjectType(ctx, 'event'))

            if (existingEvent && existingEvent.length > 0) {
                console.error('The boxting contract has already been initiated.')
                return {
                    success: false,
                    error: new BadRequestError(10001, 'The boxting contract has already been initiated.')
                }
            }

            // Create the new Event
            console.info('Convert event data to buffer.')
            let eventData = initData.event
            let event = new Event(eventData.id, eventData.startDate, eventData.endDate)
            let eventBuffer: Buffer = Buffer.from(JSON.stringify(event))

            console.info(`Put state the new eveent with id: event-${event.id}.`)
            await ctx.stub.putState(`event-${event.id}`, eventBuffer)

            // Create the elections
            console.info('Create each eletion from election list provided.')
            let electionList = initData.elections

            for (let i = 0; i < electionList.length; i++) {
                const elem = electionList[i]

                console.info('Convert data from election to buffer.')
                let election = new Election(
                    elem.id, elem.eventId,
                    elem.electionType, elem.maxVotes
                )

                let electionBuffer: Buffer = Buffer.from(JSON.stringify(election))

                console.info(`Put state the new election with id: election-${election.id}.`)
                await ctx.stub.putState(`election-${election.id}`, electionBuffer)
            }

            // Create the candidates
            console.info('Create each votable item from candidate list provided.')
            let candidateList = initData.candidates

            for (let i = 0; i < candidateList.length; i++) {
                const elem = candidateList[i]

                console.info('Convert data from candidate to buffer.')
                let candidate = new VotableItem(
                    elem.id, elem.electionId,
                    elem.firstName, elem.lastName,
                    elem.imageUrl
                )

                let candidateBuffer: Buffer = Buffer.from(JSON.stringify(candidate))

                console.info(`Put state the new candidate with id: candidate-${candidate.id}.`)
                await ctx.stub.putState(`candidate-${candidate.id}`, candidateBuffer)
            }

            console.info('Init contract completed successfully.')
            return { success: true, data: 'Init completed' }
        } catch (error) {
            console.error(`Something went wrong with the transaction: ${error}`)
            return { success: false, error: error }
        }
    }


    /**
     * Creates a new user for the contract
     * 
     * @param {Context} ctx the transaction context
     * @param {VoterData} voterData the data of the voter including the dni as id, first and last name
     * 
     */
    @Transaction()
    @Returns('Result')
    public async createVoter(ctx: Context, voterDataStr: string): Promise<Result> {

        console.info('Create voter method called.')

        try {
            console.info('Parse voter data received.')
            const voterData: VoterData = JSON.parse(voterDataStr)

            // Check if a user with the same id is already registered
            console.info('Check if user already exists.')
            const data: Uint8Array = await ctx.stub.getState(`voter-${voterData.id}`)

            if (!!data && data.length > 0) {
                console.error(`A voter with the id ${voterData.id} already exists`)

                return {
                    success: false,
                    error: new BadRequestError(10002, `A voter with the id ${voterData.id} already exists`)
                }
            }

            console.info('Convert voter data to Buffer.')
            const voter = new Voter(voterData.id, voterData.firstName, voterData.lastName)
            const voterBuffer: Buffer = Buffer.from(JSON.stringify(voter))

            console.info(`Put state the new voter with id: voter-${voter.id}.`)
            await ctx.stub.putState(`voter-${voter.id}`, voterBuffer)

            console.info('Create voter completed successfully.')
            return { success: true, data: 'Creation completed' }
        } catch (error) {
            console.error(`Something went wrong with the transaction: ${error}`)
            return { success: false, error: error }
        }
    }


    /**
     * Get the information of a specific candidate
     * 
     * @param {Context} ctx the transaction context
     * @param {string} candidateId the id of the candidate you want the get the information
     * 
     */
    @Transaction(false)
    @Returns('Result')
    public async readCandidate(ctx: Context, candidateId: string): Promise<Result> {

        console.info('Read candidate method called.')

        try {
            // Validate init
            const event = await this.validateInit(ctx)

            // Check if a candidate with the id exists
            console.info(`Check if candidate with id candidate-${candidateId} exists.`)
            const data: Uint8Array = await ctx.stub.getState(`candidate-${candidateId}`)
            const exists: boolean = (!!data && data.length > 0)

            if (!exists) {
                console.error(`A candidate with the id ${candidateId} does not exists`)
                return {
                    success: false,
                    error: new NotFoundError(10003, `A candidate with the id ${candidateId} does not exists`)
                }
            }

            // Check if event has finished
            console.info('Check if event has finished.')
            const endDate = new Date(event.endDate)
            const currentDate = Date.now()

            if (currentDate < endDate.getTime()) {
                console.error('The event has not finished yet, cannot get results')
                return {
                    success: false,
                    error: new NotPermittedError(10004, 'The event has not finished yet, cannot get results')
                }
            }

            console.info('Parsing obtained candidate.')
            const candidate: VotableItem = JSON.parse(data.toString())

            console.info('Read candidate completed successfully.')
            return { success: true, data: candidate }
        } catch (error) {
            console.error(`Something went wrong with the transaction: ${error}`)
            return { success: false, error: error }
        }
    }


    /**
     * Get the results of an specific election
     * 
     * @param {Context} ctx the transaction context
     * @param electionId 
     * 
     */
    @Transaction(false)
    @Returns('Result')
    public async getElectionResults(ctx: Context, electionId: string): Promise<Result> {

        console.info('Get election results method called.')

        try {
            // Validate init
            const event = await this.validateInit(ctx)

            // Check if election exists
            console.info(`Check if election with id election-${electionId} exists.`)
            const electionExists: boolean = await this.checkIfExists(ctx, `election-${electionId}`)

            if (!electionExists) {
                console.error(`The election ${electionId} does not exists`)
                return {
                    success: false,
                    error: new NotFoundError(10005, `The election ${electionId} does not exists`)
                }
            }

            // Check if event has finished
            console.info('Check if event has finished.')
            const endDate = new Date(event.endDate)
            const currentDate = Date.now()

            if (currentDate < endDate.getTime()) {
                console.error('The event has not finished yet, cannot get results')
                return {
                    success: false,
                    error: new NotPermittedError(10004, 'The event has not finished yet, cannot get results')
                }
            }

            // Create query to get the candidates
            const queryString = {
                selector: {
                    electionId: electionId,
                    type: 'votable'
                }
            }

            // Get the results
            console.info('Getting election results.')
            const queryRes = await this.queryWithQueryString(ctx, JSON.stringify(queryString))
            const candidates: VotableItem[] = JSON.parse(queryRes)

            console.info('Get election results completed successfully.')
            return { success: true, data: candidates }
        } catch (error) {
            console.error(`Something went wrong with the transaction: ${error}`)
            return { success: false, error: error }
        }
    }


    /**
     * Transaction to get the vote of a user on a specific election
     * 
     * @param {Context} ctx the transaction context
     * @param {string} electionId the id of the election 
     * @param {string} voterId the id of the voter
     * 
     */
    @Transaction(false)
    @Returns('Result')
    public async readVote(ctx: Context, electionId: string, voterId: string): Promise<Result> {

        console.info('Read vote method called.')

        try {
            // Validate init
            await this.validateInit(ctx)

            // Check if election with the id exists
            console.info(`Check if election with id election-${electionId} exists.`)
            const electionExist: boolean = await this.checkIfExists(ctx, `election-${electionId}`)
            if (!electionExist) {
                console.error(`The election ${electionId} does not exists`)
                return {
                    success: false,
                    error: new NotFoundError(10005, `The election ${electionId} does not exists`)
                }
            }

            // Check if voter with the id exists
            console.info(`Check if voter with id voter-${voterId} exists.`)
            const voterExist: boolean = await this.checkIfExists(ctx, `voter-${voterId}`)
            if (!voterExist) {
                console.error(`The voter ${voterId} does not exists`)
                return {
                    success: false,
                    error: new NotFoundError(10006, `The voter ${voterId} does not exists`)
                }
            }

            // Get the voter
            console.info('Getting voter.')
            const voterData: Uint8Array = await ctx.stub.getState(`voter-${voterId}`)
            const voter: Voter = JSON.parse(voterData.toString()) as Voter

            const votedElectionIds = JSON.parse(voter.votedElectionIds)
            if (votedElectionIds.length == 0) {
                console.error('The voter has not voted yet.')
                return {
                    success: false,
                    error: new BadRequestError(10007, 'The voter has not voted yet.')
                }
            }

            // Create query to get the vote
            console.info('Getting vote.')
            const queryString = {
                selector: {
                    electionId: electionId,
                    voterId: voterId,
                    type: 'vote'
                }
            }

            // Get the results
            const queryResults = await this.queryWithQueryString(ctx, JSON.stringify(queryString))

            console.info('Parsing query results.')
            const votes: Vote[] = JSON.parse(queryResults)

            if (!votes || votes.length == 0) {
                console.error('The voter has not voted yet on this election.')
                return {
                    success: false,
                    error: new BadRequestError(10007, 'The voter has not voted yet on this election.')
                }
            }

            console.info('Read vote completed successfully.')
            return { success: true, data: votes[0] }
        } catch (error) {
            console.error(`Something went wrong with the transaction: ${error}`)
            return { success: false, error: error }
        }
    }


    /**
     * Emit a new vote on a election activity
     * 
     * @param {Context} ctx the transaction context
     * @param {string} electionId the id of the election 
     * @param {string} voterId the id of the voter
     * @param {string} candidateIds the list of candidate ids as a string
     * 
     */
    @Transaction()
    @Returns('Result')
    public async emitVote(ctx: Context, electionId: string, voterId: string, candidateIds: string): Promise<Result> {

        console.info('Emit vote method called.')

        try {
            const event = await this.validateInit(ctx)

            // Check if event is avaliable for voting
            console.info('Check if event is active for voting.')
            const endDate = new Date(event.endDate)
            const startDate = new Date(event.startDate)
            const currentDate = Date.now()

            if (currentDate < startDate.getTime() || currentDate >= endDate.getTime()) {
                console.error('The event is not active for voting')
                return {
                    success: false,
                    error: new NotPermittedError(10008, 'The event is not active for voting')
                }
            }

            // Check if election exist
            console.info(`Check if election with id election-${electionId} exists.`)
            const electionData: Uint8Array = await ctx.stub.getState(`election-${electionId}`)
            const electionExist: boolean = (!!electionData && electionData.length > 0)

            if (!electionExist) {
                console.error(`The election ${electionId} does not exists`)
                return {
                    success: false,
                    error: new NotFoundError(10005, `The election ${electionId} does not exists`)
                }
            }

            // Check if voter exist
            console.info(`Check if voter with id voter-${voterId} exists.`)
            const voterData: Uint8Array = await ctx.stub.getState(`voter-${voterId}`)
            const voterExist = (!!voterData && voterData.length > 0)

            if (!voterExist) {
                console.error(`The voter ${voterId} does not exists`)
                return {
                    success: false,
                    error: new NotFoundError(10006, `The voter ${voterId} does not exists`)
                }
            }

            // Get the election and voter
            console.info('Parsing voter and election data obtained.')
            const election: Election = JSON.parse(electionData.toString()) as Election
            const voter: Voter = JSON.parse(voterData.toString()) as Voter

            // Check if the voter has already voted for this election
            console.info('Check if voter has already voted for the election.')
            const votedElectionIds = JSON.parse(voter.votedElectionIds)
            if (votedElectionIds.indexOf(election.id) != -1) {
                console.error(`The voter has already voted for the election ${election.id}`)
                return {
                    success: false,
                    error: new NotPermittedError(10009, `The voter has already voted for the election ${election.id}`)
                }
            }

            // Parse the candidate list to a votable id list
            const votableIds: string[] = JSON.parse(candidateIds)

            // Check if sent candidates are the same as max candidates
            console.info('Check if sent candidates are the required for the election.')
            if (votableIds.length != election.maxVotes) {
                console.error('The number of candidates sent is not the same as the required for the election')
                return {
                    success: false,
                    error: new BadRequestError(10010,
                        'The number of candidates sent is not the same as the required for the election')
                }
            }

            // Create a votable list
            console.info('Evaluate each candidate on list.')
            const votables: VotableItem[] = []
            for (let i = 0; i < votableIds.length; i++) {

                // Check if a candidate with the id exists
                console.info(`Check if candidate with id candidate-${votableIds[i]} exists.`)
                const data: Uint8Array = await ctx.stub.getState(`candidate-${votableIds[i]}`)
                const exists: boolean = (!!data && data.length > 0)

                if (!exists) {
                    console.error(`A candidate with the id ${votableIds[i]} does not exists`)
                    return {
                        success: false,
                        error: new NotFoundError(10003, `A candidate with the id ${votableIds[i]} does not exists`)
                    }
                }

                console.info('Check if candidate belongs to the election.')
                let votableItem = JSON.parse(data.toString()) as VotableItem

                if (votableItem.electionId != electionId) {
                    console.error(`A candidate with the id ${votableIds[i]} does not belong to election ${electionId}`)
                    return {
                        success: false,
                        error: new BadRequestError(10011,
                            `A candidate with the id ${votableIds[i]} does not belong to election ${electionId}`)
                    }
                }

                votables.push(votableItem)
            }

            /* Vote Execution */
            // Update the voter voted elections with the election id
            console.info('Update the voter voted elections with the election id.')
            votedElectionIds.push(election.id)
            voter.votedElectionIds = JSON.stringify(votedElectionIds)

            await ctx.stub.putState(`voter-${voter.id}`, Buffer.from(JSON.stringify(voter)))

            console.info('Put state new vote.')
            const strVotables = JSON.stringify(votables)
            // Create new vote
            const vote: Vote = new Vote(
                voter.id,
                election.id,
                strVotables
            )
            await ctx.stub.putState(`vote-${vote.id}`, Buffer.from(JSON.stringify(vote)))

            console.info('Emit vote completed successfully.')
            return { success: false, data: 'Vote emited!' }
        } catch (error) {
            console.error(`Something went wrong with the transaction: ${error}`)
            return { success: false, error: error }
        }
    }


    /**
     * Check if a voter already emited a vote for specific election
     * 
     * @param {Context} ctx the transaction context
     * @param {string} electionId the id of the election 
     * @param {string} voterId the id of the voter
     * 
     */
    @Transaction(false)
    @Returns('Result')
    public async checkVoteElection(ctx: Context, electionId: string, voterId: string): Promise<Result> {

        console.info('Check voted election method called.')

        try {
            // Check if election exist
            console.info(`Check if election with id election-${electionId} exists.`)
            const electionData: Uint8Array = await ctx.stub.getState(`election-${electionId}`)
            const electionExist: boolean = (!!electionData && electionData.length > 0)

            if (!electionExist) {
                console.error(`The election ${electionId} does not exists`)
                return {
                    success: false,
                    error: new NotFoundError(10005, `The election ${electionId} does not exists`)
                }
            }

            // Check if voter exist
            console.info(`Check if voter with id voter-${voterId} exists.`)
            const voterData: Uint8Array = await ctx.stub.getState(`voter-${voterId}`)
            const voterExist = (!!voterData && voterData.length > 0)

            if (!voterExist) {
                console.error(`The voter ${voterId} does not exists`)
                return {
                    success: false,
                    error: new NotFoundError(10006, `The voter ${voterId} does not exists`)
                }
            }

            // Get the election and voter
            console.info('Parse election and voter obtained data.')
            const election: Election = JSON.parse(electionData.toString()) as Election
            const voter: Voter = JSON.parse(voterData.toString()) as Voter

            // Check if the voter has already voted for this election
            console.info('Validate if user has already voted for the election.')
            const votedElectionIds = JSON.parse(voter.votedElectionIds)

            if (votedElectionIds.indexOf(election.id) != -1) {
                console.info('Voter already voted.')
                return { success: true, data: true }
            }

            console.info('Voter has not voted yet.')
            return { success: true, data: false }
        } catch (error) {
            console.error(`Something went wrong with the transaction: ${error}`)
            return { success: false, error: error }
        }
    }

    ////// PRIVATE FUNCTIONS //////

    private async validateInit(ctx: Context): Promise<Event> {
        // Validate if an event already exists, meaning contract was already initiated
        console.info('Check if contrat was already initiated.')
        const existingEvent: Event[] = JSON.parse(await this.queryByObjectType(ctx, 'event'))

        if (!existingEvent || existingEvent.length == 0) {
            console.error('The contrat has not been initiated yet.')
            throw new Error('The boxting contract has not been initiated')
        }

        // If initiated, return the current event
        console.info('Returning existing event.')
        return existingEvent[0]
    }

    private async checkIfExists(ctx: Context, id: string): Promise<boolean> {
        console.info(`Check if exist method called for id: ${id}`)
        const data: Uint8Array = await ctx.stub.getState(id)
        return (!!data && data.length > 0)
    }

    private async queryWithQueryString(ctx: Context, queryString: string): Promise<string> {

        console.info(`Querying data with: ${JSON.stringify(queryString)}`)

        let resultsIterator = await ctx.stub.getQueryResult(queryString)

        let allResults = []

        while (true) {
            let res = await resultsIterator.next()

            if (res.value && res.value.value.toString()) {
                let jsonRes: JsonResponse = {}

                console.log(res.value.value.toString())

                jsonRes.key = res.value.key

                try {
                    jsonRes.record = JSON.parse(res.value.value.toString())
                } catch (err) {
                    console.log(err)
                    jsonRes.record = res.value.value.toString()
                }

                allResults.push(jsonRes)
            }

            if (res.done) {
                console.info('Data iteration completed.')
                await resultsIterator.close()
                console.info(`Results found: ${JSON.stringify(allResults)}`)
                return JSON.stringify(allResults)
            }
        }
    }

    private async queryByObjectType(ctx: Context, objectType: string): Promise<string> {

        console.info(`Querying by ${objectType}`)
        const queryString = {
            selector: {
                type: objectType
            }
        }

        const queryResults = await this.queryWithQueryString(ctx, JSON.stringify(queryString))

        return queryResults
    }
}