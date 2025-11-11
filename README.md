Two Server Model

This repository demonstrates a Two Server Model architecture designed for secure communication between two independent servers. It integrates blockchain validation for OpenRTB bid responses to ensure cryptographic integrity and traceability.

Documentation

Design Document: Google Docs

Discussion Reference: ChatGPT Link

Overview

Server A (Local): Handles initial request processing and validation.

Server B (Remote): Performs final verification, signing, and integrity checks.

Both servers maintain synchronized blockchain-based ledgers for validation.

Sample ORTB Response

Full response: View on JSON Editor

{
  "ortbResponse": {
    "id": "imp123",
    "seatbid": [
      {
        "bid": [
          {
            "id": "imp123",
            "impid": "imp123",
            "price": 1.5,
            "ext": {
              "blockchain": [
                { "index": 0, "data": { "type": "genesis" } },
                { "index": 1, "data": { "type": "creation", "impId": "imp123" } },
                { "index": 2, "data": { "type": "price_update", "impId": "imp123" } }
              ]
            }
          }
        ]
      }
    ]
  },
  "isValidLocal": true,
  "isValidRemote": true
}

Features

Blockchain-based validation for ORTB bid transparency

Two-level verification (local and remote)

Lightweight and modular design

Integrity tracking using hash chaining and signatures

References

Google Docs

ChatGPT Discussion

Sample ORTB JSON
