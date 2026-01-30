<template>
  <q-page>
    <div class="a">
      <q-form @submit="searchDoctors" @reset="onReset" class="q-gutter-md">
        <div class="text-h6 q-dx-md">Select service</div>
        <q-select
          rounded
          outlined
          v-model="TypeVisit"
          :options="options"
          label="Select service"
          :rules="[(val) => !!val || 'Select a service']"
        />

        <div class="text-h6 q-dx-md">Select address</div>
        <div class="row">
          <div class="col-9">
            <q-input
              rounded
              outlined
              bg-color="white"
              label="Address"
              stack-label
              placeholder="Enter address"
              hint="Full address or City"
              v-model="addressText"
              debounce="500"
              @update:model-value="searchSuggestions"
              :rules="[(val) => !!val || 'Address is required']"
            >
              <template v-slot:append>
                <q-spinner v-if="loadingSuggestions" color="primary" size="20px" />
              </template>

              <q-menu no-focus fit v-model="showMenu" auto-close>
                <q-list style="min-width: 100px">
                  <q-item
                    clickable
                    v-for="(suggestion, index) in suggestionList"
                    :key="index"
                    @click="selectAddress(suggestion)"
                  >
                    <q-item-section>{{ suggestion }}</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-input>
          </div>

          <div class="col-3 text-center">
            <q-btn
              rounded
              outlined
              size="md"
              color="primary"
              glossy
              label="Current position"
              @click="getCurrentPosition"
              :loading="loadingGps"
            />
          </div>
        </div>

        <div class="q-px-sm">
          Maximum distance: <strong>{{ km }} km</strong>
          <q-slider v-model="km" :min="1" :max="50" label color="primary" />
        </div>

        <div class="text-h6 q-dx-md">From: {{ dateFrom }}</div>
        <div class="m" style="max-width: 300px">
          <q-input rounded outlined v-model="dateFrom">
            <template v-slot:prepend>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="dateFrom" mask="DD-MM-YYYY HH:mm" :options="optionsFn">
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Close" color="primary" flat />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>
            <template v-slot:append>
              <q-icon name="access_time" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-time v-model="dateFrom" mask="DD-MM-YYYY HH:mm" format24h>
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Close" color="primary" flat />
                    </div>
                  </q-time>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </div>

        <div class="text-h6 q-dx-md">To: {{ dateTo }}</div>
        <div class="m" style="max-width: 300px">
          <q-input rounded outlined v-model="dateTo">
            <template v-slot:prepend>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="dateTo" mask="DD-MM-YYYY HH:mm" :options="optionsFn">
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Close" color="primary" flat />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>
            <template v-slot:append>
              <q-icon name="access_time" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-time v-model="dateTo" mask="DD-MM-YYYY HH:mm" format24h>
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Close" color="primary" flat />
                    </div>
                  </q-time>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </div>

        <q-btn label="Search" type="submit" color="primary" />
        <q-btn label="Reset" type="reset" color="primary" flat class="q-ml-sm" />
      </q-form>
    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { api } from 'boot/axios'
import { useRouter } from 'vue-router'
import { SessionStorage, useQuasar, date } from 'quasar'

// Router and Quasar instance
const router = useRouter()
const $q = useQuasar()

// Initialization of variables
const defaultDates = getDefaultDates()
const dateFrom = ref(defaultDates.from)
const dateTo = ref(defaultDates.to)

const TypeVisit = ref(null)
const options = ref(['General visit'])

const addressText = ref('')
const suggestionList = ref([])
const showMenu = ref(false)
const loadingSuggestions = ref(false)
const loadingSearch = ref(false)
const loadingGps = ref(false)
const km = ref(10)

// Function to calculate default dates
function getDefaultDates() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(7, 0, 0)

  const dayAfter = new Date()
  dayAfter.setDate(dayAfter.getDate() + 2)
  dayAfter.setHours(23, 55, 0)

  return {
    from: date.formatDate(tomorrow, 'DD-MM-YYYY HH:mm'),
    to: date.formatDate(dayAfter, 'DD-MM-YYYY HH:mm'),
  }
}

// Date filter (not past)
// Block the selection of past dates
function optionsFn(d) {
  return d >= date.formatDate(Date.now(), 'YYYY/MM/DD')
}

// Reset fuction (Clears everything)
// Resets all fields to default values
function onReset() {
  addressText.value = ''
  TypeVisit.value = null
  km.value = 10

  // Reset Default date
  const defaults = getDefaultDates()
  dateFrom.value = defaults.from
  dateTo.value = defaults.to

  $q.notify({ type: 'info', message: 'Fields reset' })
}

// Function created when selecting an address from suggestions
function selectAddress(chosenAddress) {
  addressText.value = chosenAddress
  showMenu.value = false
}

// CALL AUTOCOMPLETE API for suggestions address
function searchSuggestions(value) {
  if (!value || value.length < 3) {
    showMenu.value = false
    return
  }
  loadingSuggestions.value = true

  api
    .get(`http://localhost:3000/api/autocomplete?text=${value}`)
    .then((response) => {
      suggestionList.value = response.data
      showMenu.value = suggestionList.value.length > 0
    })
    .catch((e) => console.error(e))
    .finally(() => {
      loadingSuggestions.value = false
    })
}

// GPS API for geologation and reverse geocoding
function getCurrentPosition() {
  if (!navigator.geolocation) {
    $q.notify({ type: 'warning', message: 'GPS not supported' })
    return
  }
  loadingGps.value = true

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude
      const lng = position.coords.longitude
      try {
        const response = await api.get(`http://localhost:3000/api/reverse?lat=${lat}&lng=${lng}`)
        if (response.data && response.data.address) {
          addressText.value = response.data.address
          $q.notify({ type: 'positive', message: 'Position found!' })
        } else {
          addressText.value = `${lat}, ${lng}`
        }
      } catch (e) {
        console.error('GPS/Server error:', e)
        addressText.value = `${lat}, ${lng}`
        $q.notify({ type: 'warning', message: 'Using coordinates (Server offline?)' })
      } finally {
        loadingGps.value = false
      }
    },
    (error) => {
      console.error('GPS error details:', error)
      loadingGps.value = false
      $q.notify({ type: 'negative', message: 'GPS error' })
    },
  )
}

// SEARCH FUNCTION
// Sends all data to the backend and processes the response
async function searchDoctors() {
  // Minimal manual validation
  if (!addressText.value || !TypeVisit.value) {
    $q.notify({ type: 'warning', message: 'Fill in Address and Service' })
    return
  }

  loadingSearch.value = true

  try {
    // Send ALL data to the backend
    const response = await api.post('http://localhost:3000/api/search', {
      address: addressText.value,
      radius: km.value,
      dateStart: dateFrom.value,
      dateEnd: dateTo.value,
    })

    if (response.data.success) {
      // SAVE RESULTS ("arrayForMap")
      SessionStorage.set('arrayForMap', response.data.results)

      // SAVE USER INFO (To center the map)
      SessionStorage.set('lat', response.data.userLocation.lat)
      SessionStorage.set('long', response.data.userLocation.lng)

      // (Optional) SAVE SEARCH CONTEXT
      // Useful if on the map page you want to write "Results for Cardiology"
      SessionStorage.set('searchContext', {
        address: addressText.value,
      })

      // Redirect
      router.push({ path: '/base/map', replace: true })
    } else {
      $q.notify({ type: 'warning', message: 'No doctors found with these criteria.' })
    }
  } catch (error) {
    console.error(error)
    $q.notify({ type: 'negative', message: 'Server communication error' })
  } finally {
    loadingSearch.value = false
  }
}
</script>

<style>
div.a {
  max-width: 90%;
  padding-left: 10px;
  padding-top: 20px;
}
q-input.m {
  max-width: min-content;
}
input,
input:hover,
input:focus,
input:active {
  background: transparent;
  border: 0;
  border-style: none;
  border-color: transparent;
  outline: none;
  outline-offset: 0;
  box-shadow: none;
  width: 100%;
}
</style>
