/*
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto = require('crypto');
import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { BoxtingVoting } from './boxting-voting';

async function getCollectionName(ctx: Context): Promise<string> {
    const mspid: string = ctx.clientIdentity.getMSPID();
    const collectionName: string = `_implicit_org_${mspid}`;
    return collectionName;
}

@Info({title: 'BoxtingVotingContract', description: 'My Private Data Smart Contract' })
export class BoxtingVotingContract extends Contract {

    @Transaction(false)
    @Returns('boolean')
    public async boxtingVotingExists(ctx: Context, boxtingVotingId: string): Promise<boolean> {
        const collectionName: string = await getCollectionName(ctx);
        const data: Uint8Array = await ctx.stub.getPrivateDataHash(collectionName, boxtingVotingId);
        return (!!data && data.length > 0);
    }

    @Transaction()
    public async createBoxtingVoting(ctx: Context, boxtingVotingId: string): Promise<void> {
        const exists: boolean = await this.boxtingVotingExists(ctx, boxtingVotingId);
        if (exists) {
            throw new Error(`The asset boxting voting ${boxtingVotingId} already exists`);
        }

        const privateAsset: BoxtingVoting = new BoxtingVoting();

        const transientData: Map<string, Uint8Array> = ctx.stub.getTransient();
        if (transientData.size === 0 || !transientData.has('privateValue')) {
            throw new Error('The privateValue key was not specified in transient data. Please try again.');
        }
        privateAsset.privateValue = transientData.get('privateValue').toString();

        const collectionName: string = await getCollectionName(ctx);
        await ctx.stub.putPrivateData(collectionName, boxtingVotingId, Buffer.from(JSON.stringify(privateAsset)));
    }

    @Transaction(false)
    @Returns('BoxtingVoting')
    public async readBoxtingVoting(ctx: Context, boxtingVotingId: string): Promise<string> {
        const exists: boolean = await this.boxtingVotingExists(ctx, boxtingVotingId);
        if (!exists) {
            throw new Error(`The asset boxting voting ${boxtingVotingId} does not exist`);
        }

        let privateDataString: string;

        const collectionName: string = await getCollectionName(ctx);
        const privateData: Uint8Array = await ctx.stub.getPrivateData(collectionName, boxtingVotingId);

        privateDataString = JSON.parse(privateData.toString());
        return privateDataString;
    }

    @Transaction()
    public async updateBoxtingVoting(ctx: Context, boxtingVotingId: string): Promise<void> {
        const exists: boolean = await this.boxtingVotingExists(ctx, boxtingVotingId);
        if (!exists) {
            throw new Error(`The asset boxting voting ${boxtingVotingId} does not exist`);
        }

        const privateAsset: BoxtingVoting = new BoxtingVoting();

        const transientData: Map<string, Uint8Array> = ctx.stub.getTransient();
        if (transientData.size === 0 || !transientData.has('privateValue')) {
            throw new Error('The privateValue key was not specified in transient data. Please try again.');
        }
        privateAsset.privateValue = transientData.get('privateValue').toString();

        const collectionName: string = await getCollectionName(ctx);
        await ctx.stub.putPrivateData(collectionName, boxtingVotingId, Buffer.from(JSON.stringify(privateAsset)));
    }

    @Transaction()
    public async deleteBoxtingVoting(ctx: Context, boxtingVotingId: string): Promise<void> {
        const exists: boolean = await this.boxtingVotingExists(ctx, boxtingVotingId);
        if (!exists) {
            throw new Error(`The asset boxting voting ${boxtingVotingId} does not exist`);
        }

        const collectionName: string = await getCollectionName(ctx);
        await ctx.stub.deletePrivateData(collectionName, boxtingVotingId);
    }

    @Transaction()
    public async verifyBoxtingVoting(ctx: Context, mspid: string, boxtingVotingId: string, objectToVerify: BoxtingVoting): Promise<boolean> {
        // Convert user provided object into a hash
        const hashToVerify: string = crypto.createHash('sha256').update(JSON.stringify(objectToVerify)).digest('hex');
        const pdHashBytes: Uint8Array = await ctx.stub.getPrivateDataHash(`_implicit_org_${mspid}`, boxtingVotingId);
        if (pdHashBytes.length === 0) {
            throw new Error(`No private data hash with the Key: ${boxtingVotingId}`);
        }

        const actualHash: string = Buffer.from(pdHashBytes).toString('hex');

        // Compare the hash calculated (from object provided) and the hash stored on public ledger
        if (hashToVerify === actualHash) {
            return true;
        } else {
            return false;
        }
    }

}
