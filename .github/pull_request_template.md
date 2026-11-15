## Description
<!-- Provide a brief description of the changes proposed in this Pull Request. -->

## Environment & Testing Checklist
- [ ] Developed and verified in an **isolated local environment** (not connected to production).
- [ ] No personal tokens, PINs, or local database files (`omnicontrol.db`) are included.
- [ ] Ran `pytest agent/tests` — all unit tests pass.
- [ ] Ran `python scripts/verify-acceptance.py` — 20/20 acceptance tests pass.
- [ ] Ran `npm --prefix apps/web run build` — Next.js build succeeds with 0 errors.

## Collaboration & Copyright Agreement
- [ ] I agree that my contributions adhere to the [OMNICONTROL Proprietary License](LICENSE) and that all rights and copyright remain with OMNICONTROL.
- [ ] No duplicated or unauthorized third-party proprietary code is introduced.
