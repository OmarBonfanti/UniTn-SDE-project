<template>
  <div class="q-pa-md">
    <q-stepper v-model="step" vertical color="primary" animated>
      <q-step :name="1" title="Permitted Privacy" icon="settings" :done="step > 1">
        <q-scroll-area
          ref="scrollAreaRef"
          style="height: 200px; max-width: 100%"
          @scroll="onScroll"
        >
          <div class="q-pa-sm text-justify">
            <div class="text-h6">Privacy Information</div>
            <p>
              Pursuant to Regulation EU 2016/679, your data will be processed for the management of
              the health appointment. The data controller is the selected Medical Center. The data
              (CF, Phone) are necessary to confirm the appointment. They will not be disclosed to
              unauthorized third parties. Scroll to the bottom to accept.
              <br /><br />
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
              incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
              exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              <br /><br />
              (Simulation of long text for scrolling)...
              <br /><br />
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat
              nulla pariatur.
            </p>
          </div>
        </q-scroll-area>

        <div class="text-caption q-pt-md text-red">
          * Scroll through the entire text to enable the "Accept" button
        </div>

        <q-stepper-navigation>
          <q-btn :disabled="!privacyAccepted" @click="step = 2" color="primary" label="Accept" />
          <q-btn flat @click="goBack" color="primary" label="Cancel" />
        </q-stepper-navigation>
      </q-step>

      <q-step :name="2" title="Patient Data" icon="person" :done="step > 2">
        <div class="text-subtitle1">Enter Doctor’s tax code (Italian CF)</div>
        <q-input
          rounded
          outlined
          v-model="cf"
          label="Doctor’s tax code (Italian CF)"
          :rules="[(val) => !!val || 'Required field']"
        />
        <q-stepper-navigation>
          <q-btn @click="checkPersonalData" color="primary" label="Next" :loading="loading" />
          <q-btn flat @click="step = 1" color="primary" label="Back" />
        </q-stepper-navigation>
      </q-step>

      <q-step :name="3" title="Email Contact" icon="mail" :done="step > 3">
        <div class="text-subtitle1">Enter your email to receive the code</div>

        <q-input
          rounded
          outlined
          v-model="email"
          label="Email Address"
          type="email"
          :rules="[
            (val) => !!val || 'Email is required',
            (val) => /.+@.+\..+/.test(val) || 'Invalid email format',
          ]"
        />

        <q-toggle
          v-model="emailConsent"
          label="I consent to receiving emails for the booking confirmation"
        />

        <q-stepper-navigation>
          <q-btn
            :disabled="!emailConsent"
            @click="sendOTP"
            color="primary"
            label="Send Code"
            :loading="loading"
          />
          <q-btn flat @click="step = 2" color="primary" label="Back" />
        </q-stepper-navigation>
      </q-step>

      <q-step :name="4" title="Verify Code" icon="sms" :done="step > 4">
        <div class="text-subtitle1">Enter the received code (e.g. 123456)</div>
        <q-input rounded outlined v-model="otpInput" label="OTP Code" mask="######" />
        <q-stepper-navigation>
          <q-btn @click="verifyOTP" color="primary" label="Verify" :loading="loading" />
          <q-btn flat @click="step = 3" color="primary" label="Back" />
        </q-stepper-navigation>
      </q-step>

      <q-step :name="5" title="Final Confirmation" icon="event_available" :done="step > 5">
        <q-card class="bg-grey-2 q-mb-md" flat bordered v-if="selectedAppointment">
          <q-list separator>
            <q-item>
              <q-item-section avatar><q-icon name="business" color="primary" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Medical Practice</q-item-label>
                <q-item-label class="text-weight-bold">{{
                  selectedAppointment.studio
                }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section avatar><q-icon name="place" color="red" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Address</q-item-label>
                <q-item-label>{{ selectedAppointment.address }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section avatar
                ><q-icon name="medical_services" color="green"
              /></q-item-section>
              <q-item-section>
                <q-item-label caption>Doctor</q-item-label>
                <q-item-label>Dr. {{ selectedAppointment.doctor }}</q-item-label>
                <q-item-label caption>{{ selectedAppointment.specialty }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section avatar><q-icon name="event" color="orange" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Date and Time</q-item-label>
                <q-item-label class="text-h6"
                  >{{ selectedAppointment.date }} at {{ selectedAppointment.time }}</q-item-label
                >
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>

        <q-stepper-navigation>
          <q-btn
            color="primary"
            label="CONFIRM BOOKING"
            icon="check"
            @click="finalizeBooking"
            :loading="loading"
          />
          <q-btn flat @click="goBack" color="negative" label="Cancel All" />
        </q-stepper-navigation>
      </q-step>
    </q-stepper>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { SessionStorage, useQuasar } from 'quasar'
import { api } from 'boot/axios'

const $q = useQuasar()
const router = useRouter()

// Date utilities
const step = ref(1)
const loading = ref(false)
const privacyAccepted = ref(false)
const cf = ref('')
const otpInput = ref('')
const selectedAppointment = ref(null)
const email = ref('')
const emailConsent = ref(false)

// On component mount, check for selected appointment
onMounted(() => {
  const data = SessionStorage.getItem('selectedBooking')
  if (!data) {
    $q.notify({ type: 'negative', message: 'No appointment selected' })
    router.push('/base/map')
    return
  }
  selectedAppointment.value = data
})

// Steps for booking process

// Step 1: Privacy Scroll
function onScroll({ verticalPercentage }) {
  if (verticalPercentage > 0.9) {
    privacyAccepted.value = true
  }
}

// Step 2: Personal Data ID (Simulated system check)
async function checkPersonalData() {
  if (!cf.value) {
    $q.notify({ type: 'warning', message: 'Enter the Doctor’s tax code (Italian CF)' })
    return
  }

  loading.value = true

  try {
    // Workers Cloudflare URL:
    const url = `https://medical-check-cf.omarbonf.workers.dev?cf=${cf.value}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.valid) {
      $q.notify({ type: 'positive', message: 'Valid Tax Code!' })
      // Simulate a small delay for UX
      setTimeout(() => {
        loading.value = false
        step.value = 3 // Move to the next step
      }, 500)
    } else {
      $q.notify({ type: 'negative', message: 'Invalid or incorrect Tax Code' })
      loading.value = false
    }
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: 'Error connecting to external service' })
    loading.value = false
  }
}

// Step 3: Send OTP to Email
async function sendOTP() {
  // Basic validation for email (check presence of '@')
  if (!email.value || !email.value.includes('@')) {
    $q.notify({ type: 'warning', message: 'Invalid email' })
    return
  }

  loading.value = true
  try {
    const res = await api.post('http://localhost:3000/api/otp/send', {
      email: email.value,
    })

    if (res.data.success) {
      $q.notify({
        type: 'info',
        message: 'Email sent! Check the server console for the link.',
        icon: 'mark_email_read',
      })
      step.value = 4
    }
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: 'Email server error' })
  } finally {
    loading.value = false
  }
}

// Step 4: Verify OTP
async function verifyOTP() {
  loading.value = true
  try {
    const res = await api.post('http://localhost:3000/api/otp/verify', {
      email: email.value, // Using email here
      code: otpInput.value,
    })

    if (res.data.success) {
      $q.notify({ type: 'positive', message: 'Verification successful!' })
      step.value = 5
    } else {
      $q.notify({ type: 'negative', message: 'Incorrect code' })
    }
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: 'Verification error' })
  } finally {
    loading.value = false
  }
}

// Step 5: Final Confirmation (Writes to DB)
async function finalizeBooking() {
  loading.value = true
  try {
    const response = await api.post('http://localhost:3000/api/book', {
      slot_id: selectedAppointment.value.id,
      user_email: email.value, // or cf.value if you use that as email
    })

    if (response.data.success) {
      $q.notify({ type: 'positive', message: 'Booking Confirmed!' })
      router.push('/Thanks')
    } else {
      $q.notify({ type: 'negative', message: 'Error: Slot no longer available' })
    }
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: 'Server Error' })
  } finally {
    loading.value = false
  }
}

// Navigation
function goBack() {
  router.push('/base/list')
}
</script>
