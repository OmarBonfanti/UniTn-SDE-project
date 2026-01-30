<template>
  <q-page>
    <div style="height: calc(100vh - 50px); width: 100%">
      <l-map
        v-if="center.lat && center.lng"
        ref="map"
        v-model:zoom="zoom"
        :center="[center.lat, center.lng]"
        :use-global-leaflet="false"
      >
        <l-tile-layer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          layer-type="base"
          name="OpenStreetMap"
        ></l-tile-layer>

        <l-marker :icon="redIcon" :lat-lng="[center.lat, center.lng]">
          <l-popup>
            <div class="text-center"><b>You are here</b></div>
          </l-popup>
        </l-marker>

        <l-marker
          v-for="(MedPractice, index) in MedPracticeArray"
          :key="index"
          :lat-lng="MedPractice.coord"
        >
          <l-popup>
            <div id="content" style="min-width: 150px">
              <h6 class="q-my-sm text-primary text-weight-bold">
                {{ MedPractice.name }}
              </h6>

              <div id="bodyContent">
                <p class="q-mb-xs"><q-icon name="place" /> {{ MedPractice.address }}</p>
                <p v-if="MedPractice.distance" class="q-mb-xs">
                  <b>{{ MedPractice.distance }} km</b> from your location
                </p>
                <hr class="q-my-sm" />
                <p class="q-mb-xs"><q-icon name="event" /> {{ getDay(MedPractice.date_start) }}</p>
                <p class="q-mb-md">
                  <q-icon name="access_time" /> {{ getHour(MedPractice.date_start) }}
                </p>

                <div class="text-center">
                  <q-btn
                    dense
                    unelevated
                    color="primary"
                    label="open appointment list"
                    @click="toList(MedPractice)"
                  />
                </div>
              </div>
            </div>
          </l-popup>
        </l-marker>
      </l-map>

      <div v-else class="flex flex-center" style="height: 100%">
        <q-spinner color="primary" size="3em" />
        <div class="q-ml-md">Loading map...</div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { date, SessionStorage } from 'quasar'

import { useRouter } from 'vue-router'

// Import Leaflet
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { LMap, LTileLayer, LMarker, LPopup } from '@vue-leaflet/vue-leaflet'

// User icon definition
const redIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const router = useRouter()

const zoom = ref(13)
const center = ref({ lat: null, lng: null })
const MedPracticeArray = ref([])

// Functions for formatting date and time
function getDay(datetime) {
  return date.formatDate(new Date(datetime), 'DD-MM-YYYY')
}
function getHour(datetime) {
  return date.formatDate(new Date(datetime), 'HH:mm')
}

// Fuction to navigate to the list page
function toList(MedPractice) {
  // Save the ID OF THE CLINIC (id_clinic), not the ID of the slot (id).
  SessionStorage.set('idPractice', MedPractice.id_clinic)

  // Create the purely aesthetic array for the header of the list page
  SessionStorage.set('MedPracticeSelected', [
    `MedPractice ${MedPractice.name} (${MedPractice.address})`,
    MedPractice.name,
    MedPractice.date_start.split('T')[0],
    'Multiple availability',
  ])

  // Go to the list
  router.push('/base/List')
}

// On component mount, retrieve data from session storage
onMounted(() => {
  // Retrieve user coordinates
  const sLat = SessionStorage.getItem('lat')
  const sLng = SessionStorage.getItem('long')

  if (sLat && sLng) {
    center.value = { lat: parseFloat(sLat), lng: parseFloat(sLng) }
  } else {
    console.warn('[Frontend] Warning: User coordinates not found in session storage.')
  }

  // Retrieve search results
  const rawList = SessionStorage.getItem('arrayForMap')

  // Remove duplicates markers based on id_clinic
  if (rawList && Array.isArray(rawList)) {
    // Log for debugging
    // console.log(`[Frontend] Processing ${rawList.length} items. Filtering duplicates...`)

    const seenClinics = new Set()
    const uniquePractices = []

    rawList.forEach((obj) => {
      const dist = obj.distance ? obj.distance.toFixed(1) : 'N/A'

      // Log for debugging
      // console.log(`   -> Analyzing: ${obj.name} (${obj.city}) - Dist: ${dist} km`)

      if (!seenClinics.has(obj.id_clinic)) {
        seenClinics.add(obj.id_clinic)

        uniquePractices.push({
          id: obj.id,
          id_clinic: obj.id_clinic,
          name: obj.name,
          address: `${obj.address}, ${obj.city}`,
          coord: [parseFloat(obj.lat), parseFloat(obj.lng)],
          date_start: obj.date_start,
          distance: dist,
        })
        // Log for debugging
        // console.log(`      [+] ADDED MARKER: ${obj.name}`)
      } else {
        // Log for debugging
        // console.log(`      [-] SKIPPED (Duplicate Clinic ID): ${obj.name}`)
      }
    })

    MedPracticeArray.value = uniquePractices
    // Log for debugging
    // console.log(`[Frontend] Total Markers rendered: ${uniquePractices.length}`)
  } else {
    // Log for debugging
    // console.warn("[Frontend] Warning: No data found in 'arrayForMap' or invalid format.")
  }
})
</script>
<style>
/* Fix z-index per Leaflet */
.leaflet-pane {
  z-index: 0;
}
.leaflet-top,
.leaflet-bottom {
  z-index: 1000;
}
</style>
