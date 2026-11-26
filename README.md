# HSRI blind coding

Web form for the human validation in the HSRI-Eval study (Health Policy and Systems Research, Faculty of Medicine Ramathibodi Hospital, Mahidol University). Two coders each classify 131 projects funded by Thailand's Health Systems Research Institute (HSRI), blind to the model-based codes and to each other.

- Static front end (`index.html`, `app.js`, `app.css`) served by GitHub Pages. Coders sign in with a username and password that the study lead creates.
- Answers are stored in Supabase (Singapore). `config.js` holds the project URL and the publishable key, which are public by design: row-level security decides what each login may read or write.
- `data/items.json` and `data/practice.json` hold the project texts (titles, keywords and abstracts as published in the HSRI Knowledge Bank, with a link to each project page). They contain no codes from the model-based survey and no labels saying how an item was sampled.
- `data/codebook.md` is the codebook shown in the guide.
- `supabase/migrations/` holds the schema and access rules; `scripts/test-rls.sql` and `scripts/test-rls-lead.sql` check them.

## Roles and who can see what

Two coders code the sample; the study lead does not code. The lead writes reference answers for the 5 practice items and, once both coders have submitted, settles the fields on which they disagree.

| Who | Can see or do |
|---|---|
| A coder | their own answers; whether the other coder has submitted (not how far they have got); the lead's practice key after finishing their own practice; answers lock when they submit |
| The study lead | the practice key they write (locked once a coder can see it); coders' progress as counts; after both coders submit, only the disputed fields, with the coders shown as A and B assigned per item from a server-side secret, so the same letter is not the same person across items |
| Someone signed in but not on the coder list | nothing |
| Anyone not signed in | the project texts and the codebook (public) |

The model-based codes are not in this database or repository. Every change to an answer is kept in a history table that no coder can read. `demo.html` runs the same page against a fake backend for design review; it saves nothing.

## Sample

131 projects from HSRI contract years 2020–2024, in a fixed random order, plus 5 practice projects that are not analysed. How the sample was drawn, and the comparison with the model-based codes, are described in the study's private records and its publications, not here, so that coders are not cued.

## Running locally

Serve the folder (for example `python3 -m http.server`) and open `index.html`. A preview with a fake backend, for design review only, can be made from `scripts/preview-mock.js` (files named `*.local.*` are not committed).

This repository holds code and public text only. Never commit exported answers, passwords or account lists.
