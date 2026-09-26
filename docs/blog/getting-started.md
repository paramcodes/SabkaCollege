---
title: "Getting started with SabkaCollege"
description: "A short tour of the catalogue, previews, purchases, and the learning area so you know exactly what to do next."
slug: "getting-started"
publishedAt: "2026-01-15"
readingTime: "4 min read"
tags: ["getting-started", "students"]
---

SabkaCollege sells individual self-paced courses. There is no subscription, no
bundle tier. You buy one course once, and that purchase gives you a **paid
entitlement** to the lessons in it. Non-preview lessons require that paid
entitlement; only preview lessons are open to everyone.

This post walks the whole path in the order you will actually move through it.

## 1. Browse the catalogue

Start at the [course catalogue](/courses). The catalogue lists only courses
with `published` status, so a course you can see here is a course you can
start today.

Each card shows the course title, a short description, its estimated duration,
and its price. Filters are shareable: the search text and the selected focus
area live in the query string, so you can send someone the exact filtered view
you are looking at.

## 2. Read the overview and the syllabus

Every course has two public pages before you pay for anything.

- The **overview** at `/courses/<course-slug>` explains the course in full and
  shows the course outcomes plus links to the preview lessons.
- The **syllabus** at `/courses/<course-slug>/syllabus` lists every module and
  lesson in order, with the duration of each one.

Reading the syllabus first is the fastest way to know whether a course is
right for you. If the module list does not match the outcome you are after,
move on. There is no cost to being thorough here.

## 3. Watch a preview lesson

Each course marks at least one lesson as a preview. Preview lessons play at
`/courses/<course-slug>/preview/<lesson-slug>` without an account and without a
purchase.

Previews are deliberately chosen to show the pace and the voice of the course.
They are not a trailer for the whole thing, and they do not time out.

> If a preview does not load, the video host may be blocked on your network.
> The syllabus above still tells you whether the course is a fit.

## 4. Sign in, then purchase

When you are ready, sign in and use the purchase card on the course overview.
Checkout runs through Stripe as a one-time payment.

Three things worth knowing before you click through:

- You must be signed in first. Your purchase and your progress are both tied to
  your account, so the app sends you to sign in and brings you back.
- Your card details never touch our servers. The payment form is hosted by
  Stripe.
- Access begins when Stripe confirms the payment, not when you click pay. If
  you land back on the course and still see the purchase card, give it a few
  seconds and reload.

## 5. Learn in the learning area

After purchase, the course appears in two places.

- `/dashboard` shows your overall progress and a **Continue learning** card
  that returns you to the exact lesson you stopped at.
- `/learn/<course-slug>` lists the course modules and lessons with your
  completion state on each one.

Open a lesson and it plays in the built-in player. The player saves your
position as you watch, so closing the tab and coming back later resumes where
you left off. Completed lessons are marked as done and stay marked.

## What to do when something looks wrong

| Symptom | What it usually means |
| --- | --- |
| The catalogue is empty | The course is still a draft, or the data store is unavailable |
| The purchase card will not load | You are signed out, or the course has no Stripe price yet |
| A lesson will not play | The video host is unreachable, or the reference is not set |
| Progress is missing after refresh | The save is still in flight; wait a second and reload |

If a page shows an explicit unavailable state with a retry button, that is the
app telling you the data store did not answer. Retrying is safe.

## Where to go next

Read the [teammate guides](/docs) if you maintain the content, or pick a
course and start with its syllabus. The syllabus is the contract: it tells you
exactly what you will be able to do when you finish.
