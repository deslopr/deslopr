# Security

deslopr reads files and runs `git`; it never sends anything over the network, and the playground runs entirely in your browser.

The agent hooks execute `node bin/deslopr.js hook` (or `npx deslopr hook`) after file edits. They only read the edited file and the git diff, and only write to stderr.

To report a vulnerability, open a private security advisory on the GitHub repository ("Security" tab, "Report a vulnerability"). Please do not file a public issue. We aim to reply within a week.
