'use client'

export async function establishServerSession(firebaseUser, provisioning = {}) {
  let idToken = await firebaseUser.getIdToken()
  let response = await postSession(idToken, provisioning)
  let body = await response.json()

  if (body.data?.refreshRequired || body.data?.provisioned && body.data?.refreshRequired) {
    idToken = await firebaseUser.getIdToken(true)
    response = await postSession(idToken, provisioning)
    body = await response.json()
  }
  return { response, body }
}

async function postSession(idToken, provisioning) {
  return fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, ...provisioning }),
  })
}
