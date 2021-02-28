export interface CandidateData {
    id: string
    electionId: string
    firstName: string
    lastName: string
    imageUrl: string
}

export interface EventData {
    id: string
    startDate: string
    endDate: string
}

export interface ElectionData {
    id: string
    eventId: string
    electionType: 'single' | 'multiple'
    maxVotes: number
}

export interface InitData {
    event: EventData
    elections: ElectionData[]
    candidates: CandidateData[]
}

export interface VoterData {
    id: string
    firstName: string
    lastName: string
}

export interface JsonResponse {
    key?: string
    record?: any
}

export interface Result {
    success: boolean,
    data?: {} | string,
    error?: {} | string
}