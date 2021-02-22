/*
 * SPDX-License-Identifier: Apache-2.0
 */

 // tslint:disable: no-unused-expression
import { Context } from 'fabric-contract-api';
import { ChaincodeStub, ClientIdentity } from 'fabric-shim';
import { BoxtingVotingContract } from '.';

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import crypto = require('crypto');
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import winston = require('winston');

chai.should();
chai.use(chaiAsPromised);
chai.use(sinonChai);

class TestContext implements Context {
    public stub: sinon.SinonStubbedInstance<ChaincodeStub> = sinon.createStubInstance(ChaincodeStub);
    public clientIdentity: sinon.SinonStubbedInstance<ClientIdentity> = sinon.createStubInstance(ClientIdentity);
    public logger = {
        getLogger: sinon.stub().returns(sinon.createStubInstance(winston.createLogger().constructor)),
        setLevel: sinon.stub(),
    };
}

describe('BoxtingVotingContract', () => {

    let contract: BoxtingVotingContract;
    let ctx: TestContext;
    const mspid = 'one';
    const collectionName = `_implicit_org_${mspid}`;

    beforeEach(() => {
        contract = new BoxtingVotingContract();
        ctx = new TestContext();
        ctx.clientIdentity.getMSPID.returns(mspid);
        ctx.stub.getPrivateData.withArgs(collectionName, '001').resolves(Buffer.from('{"privateValue":"150"}'));
        const hashToVerify = crypto.createHash('sha256').update('{"privateValue":"150"}').digest('hex');
        ctx.stub.getPrivateDataHash.withArgs(collectionName, '001').resolves(Buffer.from(hashToVerify, 'hex'));
    });

    describe('#boxtingVotingExists', () => {

        it('should return true for a boxting voting', async () => {
            await contract.boxtingVotingExists(ctx, '001').should.eventually.be.true;
        });

        it('should return false for a boxting voting that does not exist', async () => {
            await contract.boxtingVotingExists(ctx, '003').should.eventually.be.false;
        });
    });

    describe('#createBoxtingVoting', () => {

        it('should throw an error for a boxting voting that already exists', async () => {
            await contract.createBoxtingVoting(ctx, '001').should.be.rejectedWith(/The asset boxting voting 001 already exists/);
        });

        it('should throw an error if transient data is not provided when creating a boxting voting', async () => {
            const transientMap: Map<string, Buffer> = new Map<string, Buffer>();
            ctx.stub.getTransient.returns(transientMap);
            await contract.createBoxtingVoting(ctx, '002').should.be.rejectedWith(`The privateValue key was not specified in transient data. Please try again.`);
        });

        it('should throw an error if transient data key is not privateValue', async () => {
            const transientMap: Map<string, Buffer> = new Map<string, Buffer>();
            transientMap.set('prVal', Buffer.from('125'));
            ctx.stub.getTransient.returns(transientMap);
            await contract.createBoxtingVoting(ctx, '002').should.be.rejectedWith(`The privateValue key was not specified in transient data. Please try again.`);
        });

        it('should create a boxting voting if transient data key is privateValue', async () => {
            const transientMap: Map<string, Buffer> = new Map<string, Buffer>();
            transientMap.set('privateValue', Buffer.from('1500'));
            ctx.stub.getTransient.returns(transientMap);
            await contract.createBoxtingVoting(ctx, '002');
            ctx.stub.putPrivateData.should.have.been.calledOnceWithExactly(collectionName, '002', Buffer.from('{"privateValue":"1500"}'));
        });
    });

    describe('#readPrivateBoxtingVoting', () => {

        it('should throw an error for a boxting voting that does not exist', async () => {
            await contract.readBoxtingVoting(ctx, '003').should.be.rejectedWith(/The asset boxting voting 003 does not exist/);
        });

        it('should return a boxting voting', async () => {
            await contract.readBoxtingVoting(ctx, '001').should.eventually.deep.equal({ privateValue: '150' });
            ctx.stub.getPrivateData.should.have.been.calledWithExactly(collectionName, '001');
        });
    });

    describe('#updateBoxtingVoting', () => {

        it('should throw an error for a boxting voting that does not exist', async () => {
            await contract.updateBoxtingVoting(ctx, '003').should.be.rejectedWith(/The asset boxting voting 003 does not exist/);
        });

        it('should throw an error if transient data is not provided when updating a boxting voting', async () => {
            const transientMap: Map<string, Buffer> = new Map<string, Buffer>();
            ctx.stub.getTransient.returns(transientMap);
            await contract.updateBoxtingVoting(ctx, '001').should.be.rejectedWith(`The privateValue key was not specified in transient data. Please try again.`);
        });

        it('should update my private asset if transient data key is privateValue', async () => {
            const transientMap: Map<string, Buffer> = new Map<string, Buffer>();
            transientMap.set('privateValue', Buffer.from('99'));
            ctx.stub.getTransient.returns(transientMap);
            await contract.updateBoxtingVoting(ctx, '001');
            ctx.stub.putPrivateData.should.have.been.calledOnceWithExactly(collectionName, '001', Buffer.from('{"privateValue":"99"}'));
        });

        it('should throw an error if transient data key is not privateValue', async () => {
            const transientMap: Map<string, Buffer> = new Map<string, Buffer>();
            transientMap.set('prVal', Buffer.from('125'));
            ctx.stub.getTransient.returns(transientMap);
            await contract.updateBoxtingVoting(ctx, '001').should.be.rejectedWith(`The privateValue key was not specified in transient data. Please try again.`);
        });
    });

    describe('#deleteBoxtingVoting', () => {

        it('should throw an error for a boxting voting that does not exist', async () => {
            await contract.deleteBoxtingVoting(ctx, '003').should.be.rejectedWith(/The asset boxting voting 003 does not exist/);
        });

        it('should delete a boxting voting', async () => {
            await contract.deleteBoxtingVoting(ctx, '001');
            ctx.stub.deletePrivateData.should.have.been.calledOnceWithExactly(collectionName, '001');
        });
    });

    describe('#verifyBoxtingVoting', () => {

        it('should return true if hash calculated from object provided matches the hash of the private data', async () => {
            const privateObj: string = '{"privateValue":"125"}';
            const hashToVerify: string = crypto.createHash('sha256').update(privateObj).digest('hex');
            ctx.stub.getPrivateDataHash.withArgs(collectionName, '001').resolves(Buffer.from(hashToVerify, 'hex'));
            const result: boolean = await contract.verifyBoxtingVoting(ctx, mspid, '001', {privateValue: '125'});
            result.should.equal(true);
        });

        it('should return false if hash calculated from object provided does not match the hash of the private data', async () => {
            ctx.stub.getPrivateDataHash.withArgs(collectionName, '001').resolves(Buffer.from('someHash'));
            const result: boolean = await contract.verifyBoxtingVoting(ctx, mspid, '001', {privateValue: 'someValue'});
            result.should.equal(false);
        });

        it('should throw an error when user tries to verify an asset that doesnt exist', async () => {
            ctx.stub.getPrivateDataHash.withArgs(collectionName, '001').resolves(Buffer.from(''));
            await contract.verifyBoxtingVoting(ctx, mspid, '001', {privateValue: 'someValue'}).should.be.rejectedWith('No private data hash with the Key: 001');
        });
    });
});
