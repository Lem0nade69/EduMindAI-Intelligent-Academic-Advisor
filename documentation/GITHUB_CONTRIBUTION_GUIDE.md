# GitHub Contribution Guide

## Commit message standard

Use short, meaningful, action-oriented commit messages. Examples:

- `Integrated Gemini API`
- `Added AI chatbot feature`
- `Improved adaptive prompt engineering`
- `Added AI quiz generation`
- `Implemented AI response validation`
- `Added AI workflow documentation`
- `Connected frontend AI features to backend`
- `Updated README with AI architecture`

Avoid vague messages such as `update`, `done`, `final`, or `completed`.

## Recommended contribution flow

Each team member should work from the latest `main` branch, make a focused change, and push regularly.

```bash
git pull origin main
git checkout -b feature/short-description
# make and test changes
git add .
git commit -m "Describe the actual change"
git push -u origin feature/short-description
```

Then open a Pull Request when the team is using PR-based collaboration.

## Important

Do not commit:

- `.env` files
- API keys or passwords
- `node_modules/`
- generated build output
- personal editor files
- large temporary archives

Every team member should make commits using their own GitHub account so the repository contribution history accurately reflects individual participation.
