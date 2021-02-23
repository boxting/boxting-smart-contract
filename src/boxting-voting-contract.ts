/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { BoxtingVoting } from './boxting-voting';

@Info({title: 'BoxtingVotingContract', description: 'My Smart Contract' })
export class BoxtingVotingContract extends Contract {

    @Transaction(false)
    @Returns('boolean')
    public async boxtingVotingExists(ctx: Context, boxtingVotingId: string): Promise<boolean> {
        const data: Uint8Array = await ctx.stub.getState(boxtingVotingId);
        return (!!data && data.length > 0);
    }

    @Transaction()
    public async createBoxtingVoting(ctx: Context, boxtingVotingId: string, value: string): Promise<void> {
        const exists: boolean = await this.boxtingVotingExists(ctx, boxtingVotingId);
        if (exists) {
            throw new Error(`The boxting voting ${boxtingVotingId} already exists`);
        }
        const boxtingVoting: BoxtingVoting = new BoxtingVoting();
        boxtingVoting.value = value;
        const buffer: Buffer = Buffer.from(JSON.stringify(boxtingVoting));
        await ctx.stub.putState(boxtingVotingId, buffer);
    }

    @Transaction(false)
    @Returns('BoxtingVoting')
    public async readBoxtingVoting(ctx: Context, boxtingVotingId: string): Promise<BoxtingVoting> {
        const exists: boolean = await this.boxtingVotingExists(ctx, boxtingVotingId);
        if (!exists) {
            throw new Error(`The boxting voting ${boxtingVotingId} does not exist`);
        }
        const data: Uint8Array = await ctx.stub.getState(boxtingVotingId);
        const boxtingVoting: BoxtingVoting = JSON.parse(data.toString()) as BoxtingVoting;
        return boxtingVoting;
    }

    @Transaction()
    public async updateBoxtingVoting(ctx: Context, boxtingVotingId: string, newValue: string): Promise<void> {
        const exists: boolean = await this.boxtingVotingExists(ctx, boxtingVotingId);
        if (!exists) {
            throw new Error(`The boxting voting ${boxtingVotingId} does not exist`);
        }
        const boxtingVoting: BoxtingVoting = new BoxtingVoting();
        boxtingVoting.value = newValue;
        const buffer: Buffer = Buffer.from(JSON.stringify(boxtingVoting));
        await ctx.stub.putState(boxtingVotingId, buffer);
    }

    @Transaction()
    public async deleteBoxtingVoting(ctx: Context, boxtingVotingId: string): Promise<void> {
        const exists: boolean = await this.boxtingVotingExists(ctx, boxtingVotingId);
        if (!exists) {
            throw new Error(`The boxting voting ${boxtingVotingId} does not exist`);
        }
        await ctx.stub.deleteState(boxtingVotingId);
    }

}
