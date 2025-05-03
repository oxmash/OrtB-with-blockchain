const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const crypto = require('crypto');
const { generateKeyPairSync } = crypto;

// --- Shared DLT and Blockchain Classes ---
class SimpleDLT {
  constructor() {
    this.chain = [this.createGenesisBlock()];
  }

  createGenesisBlock() {
    const genesis = {
      index: 0,
      timestamp: Date.now(),
      data: { type: 'genesis' },
      previousHash: '0',
    };
    genesis.hash = this.calculateHash(genesis);
    return genesis;
  }

  addBlock(newBlock) {
    if (this.validateBlock(newBlock)) {
      this.chain.push(newBlock);
      return true;
    }
    return false;
  }

  validateBlock(block) {
    const last = this.chain[this.chain.length - 1];
    return block.previousHash === last.hash && block.hash === this.calculateHash(block);
  }

  calculateHash(block) {
    return crypto.createHash('sha256')
      .update(JSON.stringify(block.data) + block.previousHash)
      .digest('hex');
  }
}

class BlockchainAdObject {
  constructor(impId, price) {
    // generate RSA key pair for this ad object
    const keyPair = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    this.dlt = new SimpleDLT();
    this.impId = impId;
    this.privateKey = keyPair.privateKey;
    this.publicKey = keyPair.publicKey;

    // only create a transaction if both impId and price are provided
    if (impId != null && price != null) {
      this.createInitialTransaction(price);
    }
  }

  createInitialTransaction(price) {
    const tx = {
      type: 'creation',
      impId: this.impId,
      price: price,
      timestamp: Date.now(),
      publicKey: this.publicKey,
      signature: this.signData(`${this.impId}|${price}`)
    };
    const prevHash = this.dlt.chain[0].hash;
    this.dlt.addBlock({
      index: 1,
      timestamp: Date.now(),
      data: tx,
      previousHash: prevHash,
      hash: this.dlt.calculateHash({ data: tx, previousHash: prevHash })
    });
  }

  signData(data) {
    const signer = crypto.createSign('SHA256');
    signer.update(data);
    return signer.sign(this.privateKey, 'base64');
  }

  verifySignature(data, signature, pubKey) {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(data);
    return verifier.verify(pubKey, signature, 'base64');
  }

  updatePrice(newPrice) {
    const tx = {
      type: 'price_update',
      impId: this.impId,
      previousPrice: this.getCurrentPrice(),
      newPrice: newPrice,
      timestamp: Date.now(),
      publicKey: this.publicKey,
      signature: this.signData(`${this.impId}|${newPrice}`)
    };
    const last = this.dlt.chain[this.dlt.chain.length - 1];
    const blk = {
      index: last.index + 1,
      timestamp: Date.now(),
      data: tx,
      previousHash: last.hash,
      hash: this.dlt.calculateHash({ data: tx, previousHash: last.hash })
    };
    return this.dlt.addBlock(blk) ? blk : null;
  }

  getCurrentPrice() {
    const lastData = this.dlt.chain[this.dlt.chain.length - 1].data;
    return lastData.newPrice != null ? lastData.newPrice : this.dlt.chain[1].data.price;
  }

  // verify full chain integrity and signatures
  validateChain() {
    for (let i = 1; i < this.dlt.chain.length; i++) {
      const block = this.dlt.chain[i];
      const prev = this.dlt.chain[i - 1];
      if (block.previousHash !== prev.hash) return false;
      // reconstruct the data string
      const d = block.data;
      const payload = d.type === 'creation'
        ? `${d.impId}|${d.price}`
        : `${d.impId}|${d.newPrice}`;
      if (!this.verifySignature(payload, d.signature, d.publicKey)) return false;
    }
    return true;
  }
}

// --- Second Ad Server (responds to ORTB requests) ---
const secondApp = express();
secondApp.use(bodyParser.json());
// this server's own key pair (used for signing updates)
const secondKeys = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

// Accept OpenRTB BidRequest at /ortb-bid
secondApp.post('/ortb-bid', (req, res) => {
  const { id: impId, imp, ext } = req.body;
  // load the chain from ext.blockchain
  const bidObj = new BlockchainAdObject();
  bidObj.dlt.chain = ext.blockchain;
  bidObj.impId = impId;
  // create/update price on second server (e.g., echo bidfloor)
  const bidfloor = imp[0].bidfloor;
  bidObj.privateKey = secondKeys.privateKey;
  bidObj.publicKey = secondKeys.publicKey;
  const updated = bidObj.updatePrice(bidfloor);

  // build ORTB BidResponse
  const bidResponse = {
    id: impId,
    seatbid: [{
      bid: [{
        id: impId,
        impid: impId,
        price: bidfloor,
        ext: { blockchain: bidObj.dlt.chain }
      }]
    }]
  };
  res.json(bidResponse);
});

// Verification endpoint for chain
secondApp.post('/verify-bid', (req, res) => {
  const { bidChain } = req.body;
  const obj = new BlockchainAdObject();
  obj.dlt.chain = bidChain;
  // set impId from chain
  obj.impId = bidChain[1].data.impId;
  const valid = obj.validateChain();
  res.json({ isValid: valid });
});

secondApp.listen(3001, () => {
  console.log('Second Ad Server listening on port 3001');
});

// --- First Ad Server (initiates ORTB request) ---
const firstApp = express();
firstApp.use(bodyParser.json());

firstApp.post('/create-bid', async (req, res) => {
  const { impId, initialPrice } = req.body;
  // build initial blockchain object
  const bidObj = new BlockchainAdObject(impId, initialPrice);

  //    wrap into an OpenRTB BidRequest
  const ortbReq = {
    id: impId,
    imp: [{ id: impId, bidfloor: initialPrice }],
    ext: { blockchain: bidObj.dlt.chain }
  };

  try {
    // send to second ad server
    const resp = await axios.post('http://localhost:3001/ortb-bid', ortbReq);
    const ortbRes = resp.data;

    // extract and verify chain locally
    const chain = ortbRes.seatbid[0].bid[0].ext.blockchain;
    const localObj = new BlockchainAdObject();
    localObj.dlt.chain = chain;
    localObj.impId = impId;
    const isValidLocal = localObj.validateChain();

    // ask second server to verify as well
    const verifyResp = await axios.post('http://localhost:3001/verify-bid', { bidChain: chain });
    const isValidRemote = verifyResp.data.isValid;

    res.json({ ortbResponse: ortbRes, isValidLocal, isValidRemote });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

firstApp.listen(3000, () => {
  console.log('First Ad Server listening on port 3000');
});
