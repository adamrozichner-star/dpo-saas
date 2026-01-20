// Email Integration Helper
// Use these functions throughout the app to trigger emails

import {
  sendWelcomeEmail,
  sendNewMessageNotification,
  sendDataSubjectRequestNotification,
  sendTrialEndingReminder,
  sendPaymentConfirmation,
} from './email'

/**
 * Call after user completes onboarding
 */
export async function onUserOnboardingComplete(
  userEmail: string,
  userName: string,
  orgName: string,
  dpoName: string
) {
  return sendWelcomeEmail(userEmail, {
    userName,
    orgName,
    dpoName,
  })
}

/**
 * Call when DPO sends a message to user
 */
export async function onNewDpoMessage(
  userEmail: string,
  userName: string,
  dpoName: string,
  threadSubject: string,
  messagePreview: string
) {
  return sendNewMessageNotification(userEmail, {
    userName,
    dpoName,
    threadSubject,
    messagePreview: messagePreview.substring(0, 200) + (messagePreview.length > 200 ? '...' : ''),
  })
}

/**
 * Call when a data subject request is submitted
 */
export async function onDataSubjectRequest(
  userEmail: string,
  userName: string,
  requestType: 'access' | 'rectification' | 'erasure' | 'objection',
  requesterName: string,
  requesterEmail: string
) {
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + 30)

  return sendDataSubjectRequestNotification(userEmail, {
    userName,
    requestType,
    requesterName,
    requesterEmail,
    deadline: deadline.toLocaleDateString('he-IL'),
  })
}

/**
 * Call for trial ending reminders (used by cron)
 */
export async function onTrialEnding(
  userEmail: string,
  userName: string,
  orgName: string,
  daysLeft: number,
  trialEndDate: string
) {
  return sendTrialEndingReminder(userEmail, {
    userName,
    orgName,
    daysLeft,
    trialEndDate,
  })
}

/**
 * Call after successful payment
 */
export async function onPaymentSuccess(
  userEmail: string,
  userName: string,
  orgName: string,
  planName: string,
  amount: string
) {
  const nextBilling = new Date()
  nextBilling.setMonth(nextBilling.getMonth() + 1)

  return sendPaymentConfirmation(userEmail, {
    userName,
    orgName,
    planName,
    amount,
    nextBillingDate: nextBilling.toLocaleDateString('he-IL'),
  })
}
