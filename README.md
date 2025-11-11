# Two Server Model

This repository demonstrates a **Two Server Model** architecture designed for secure communication between two independent servers. It integrates blockchain validation for OpenRTB bid responses to ensure cryptographic integrity and traceability.

## Documentation

- **Design Document:** [Google Docs](https://docs.google.com/document/d/172WiTigdmnZbTdkynwmWQDCu3msM242nHGPtm1FMk4I/edit?usp=sharing)
- **Discussion Reference:** [ChatGPT Link](https://chatgpt.com/share/681ae10e-bcdc-800d-be95-cffa7677cff4)

## Overview

- **Server A (Local):** Handles initial request processing and validation.
- **Server B (Remote):** Performs final verification, signing, and integrity checks.
- Both servers maintain synchronized blockchain-based ledgers for validation.

## Sample ORTB Response

Full response: [View on JSON Editor](https://jsoneditoronline.org/#left=cloud.c1bf970fcdba47f4982c5cc640e68a99)

```json
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
```

## Features

- Blockchain-based validation for ORTB bid transparency
- Two-level verification (local and remote)
- Lightweight and modular design
- Integrity tracking using hash chaining and signatures

## References

- [Google Docs](https://docs.google.com/document/d/172WiTigdmnZbTdkynwmWQDCu3msM242nHGPtm1FMk4I/edit?usp=sharing)
- [ChatGPT Discussion](https://chatgpt.com/share/681ae10e-bcdc-800d-be95-cffa7677cff4)
- [Sample ORTB JSON](https://jsoneditoronline.org/#left=cloud.c1bf970fcdba47f4982c5cc640e68a99)
