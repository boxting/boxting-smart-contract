/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context } from 'fabric-contract-api';
import { ChaincodeStub, ClientIdentity } from 'fabric-shim';
import { BoxtingVotingContract } from '.';

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
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

    beforeEach(() => {
        contract = new BoxtingVotingContract();
        ctx = new TestContext();
        ctx.stub.getState.withArgs('1001').resolves(Buffer.from('{"value":"boxting voting 1001 value"}'));
        ctx.stub.getState.withArgs('1002').resolves(Buffer.from('{"value":"boxting voting 1002 value"}'));
    });

    describe('#boxtingVotingExists', () => {

        it('should return true for a boxting voting', async () => {
            await contract.boxtingVotingExists(ctx, '1001').should.eventually.be.true;
        });

        it('should return false for a boxting voting that does not exist', async () => {
            await contract.boxtingVotingExists(ctx, '1003').should.eventually.be.false;
        });

    });

    describe('#createBoxtingVoting', () => {

        it('should create a boxting voting', async () => {
            await contract.createBoxtingVoting(ctx, '1003', 'boxting voting 1003 value');
            ctx.stub.putState.should.have.been.calledOnceWithExactly('1003', Buffer.from('{"value":"boxting voting 1003 value"}'));
        });

        it('should throw an error for a boxting voting that already exists', async () => {
            await contract.createBoxtingVoting(ctx, '1001', 'myvalue').should.be.rejectedWith(/The boxting voting 1001 already exists/);
        });

    });

    describe('#readBoxtingVoting', () => {

        it('should return a boxting voting', async () => {
            await contract.readBoxtingVoting(ctx, '1001').should.eventually.deep.equal({ value: 'boxting voting 1001 value' });
        });

        it('should throw an error for a boxting voting that does not exist', async () => {
            await contract.readBoxtingVoting(ctx, '1003').should.be.rejectedWith(/The boxting voting 1003 does not exist/);
        });

    });

    describe('#updateBoxtingVoting', () => {

        it('should update a boxting voting', async () => {
            await contract.updateBoxtingVoting(ctx, '1001', 'boxting voting 1001 new value');
            ctx.stub.putState.should.have.been.calledOnceWithExactly('1001', Buffer.from('{"value":"boxting voting 1001 new value"}'));
        });

        it('should throw an error for a boxting voting that does not exist', async () => {
            await contract.updateBoxtingVoting(ctx, '1003', 'boxting voting 1003 new value').should.be.rejectedWith(/The boxting voting 1003 does not exist/);
        });

    });

    describe('#deleteBoxtingVoting', () => {

        it('should delete a boxting voting', async () => {
            await contract.deleteBoxtingVoting(ctx, '1001');
            ctx.stub.deleteState.should.have.been.calledOnceWithExactly('1001');
        });

        it('should throw an error for a boxting voting that does not exist', async () => {
            await contract.deleteBoxtingVoting(ctx, '1003').should.be.rejectedWith(/The boxting voting 1003 does not exist/);
        });

    });

});
