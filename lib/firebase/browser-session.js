'use client'

export async function establishServerSession(firebaseUser, provisioning = {}, options = {}) {
  let idToken = await firebaseUser.getIdToken()
  let response = await postSession(idToken, provisioning, options)
  let body = await response.json()

  if (body.data?.refreshRequired || body.data?.provisioned && body.data?.refreshRequired) {
    idToken = await firebaseUser.getIdToken(true)
    response = await postSession(idToken, provisioning, options)
    body = await response.json()
  }
  return { response, body }
}

export async function establishPasswordSession(email, password) {
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return { response, body: await response.json() }
}

async function postSession(idToken, provisioning, options) {
  return fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, ...provisioning, sessionRefresh: Boolean(options.refresh) }),
  })
}
