# HSRI blind coding

Web form for the human validation in the HSRI-Eval study (Health Policy and Systems Research, Faculty of Medicine Ramathibodi Hospital, Mahidol University). Two coders each classify 131 projects funded by Thailand's Health Systems Research Institute (HSRI), blind to the model-based codes and to each other.

- Static front end (`index.html`, `app.js`, `app.css`) served by GitHub Pages. Coders sign in with a username and password that the study lead creates.
- Answers are stored in Supabase (Singapore). `config.js` holds the project URL and the publishable key, which are public by design: row-level security decides what each login may read or write.
- `data/items.json` and `data/practice.json` hold the project texts (titles, keywords and abstracts as published in the HSRI Knowledge Bank, with a link to each project page). They contain no codes from the model-based survey and no labels saying how an item was sampled.
- `data/codebook.md` is the codebook shown in the guide.
- `supabase/migrations/` holds the schema and access rules; `scripts/test-rls.sql` checks them.

## Who can see what

| Who | Can see |
|---|---|
| A coder | their own answers; the other coder's progress as counts only |
| Someone signed in but not on the coder list | nothing |
| Anyone not signed in | the project texts and the codebook (public) |
| The study lead, after both coders submit | all answers, exported for analysis |

Every change to an answer is kept in a history table that no coder can read, so the methods can report how often answers were revised.

## Sample

131 projects from HSRI contract years 2020–2024, in a fixed random order, plus 5 practice projects that are not analysed. How the sample was drawn, and the comparison with the model-based codes, are described in the study's private records and its publications, not here, so that coders are not cued.

## Running locally

Serve the folder (for example `python3 -m http.server`) and open `index.html`. A preview with a fake backend, for design review only, can be made from `scripts/preview-mock.js` (files named `*.local.*` are not committed).

This repository holds code and public text only. Never commit exported answers, passwords or account lists.
