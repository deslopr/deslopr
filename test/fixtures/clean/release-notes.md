# FlowSync 2.0

FlowSync now syncs Google and Outlook calendars both ways. Before 2.0, changes made in Outlook took up to 15 minutes to show up; they now arrive in under 30 seconds.

## What changed

- Two-way sync for Outlook. You no longer need the read-only export link.
- Busy blocks are private by default. Colleagues see "busy", not the event title.
- The weekly digest is off unless you turn it on in Settings, under Notifications.

## Upgrading

Run `flowsync migrate` once per workspace. It takes about a minute for 1,000 users and is safe to re-run. If it fails halfway, nothing is lost: the old sync keeps running until the migration finishes.

We dropped support for the v1 webhook format. If you still post to `/hooks/v1`, switch to `/hooks/v2` before June 30; the payload is the same except `start` and `end` are now ISO 8601 strings.

## Known issues

Recurring events with exceptions created before 2019 sometimes lose their exceptions on the first sync. It's not common, but if you see it, re-save the series once in Google Calendar. We're working on a proper fix.

Questions go to support@flowsync.example or the #flowsync channel in our community Slack. Marta and Ivo answer most of them within a day.
