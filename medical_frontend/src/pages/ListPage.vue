<template>
  <q-page padding>
    <div class="q-gutter-sm">
      <div class="row items-center justify-between q-mb-md">
        <h5 class="q-my-none text-primary">Appointments</h5>

        <q-btn
          v-if="isFiltered"
          flat
          icon="close"
          label="Show All Clinics"
          color="negative"
          @click="resetFilter"
        />
      </div>

      <q-tree :nodes="AppointmentTree" node-key="id" default-expand-all no-connectors>
        <template v-slot:header-card="prop">
          <div class="row full-width items-center q-pa-sm bg-grey-2 rounded-borders">
            <div class="col">
              <div class="text-subtitle2 text-weight-bold text-primary">
                Dr. {{ prop.node.data.doctor_name }} {{ prop.node.data.doctor_surname }}
              </div>
              <div class="text-caption text-black">
                General Visit - <span class="text-weight-medium">{{ prop.node.data.name }}</span>
              </div>
              <div class="text-caption text-grey-8">
                <q-icon name="place" /> {{ prop.node.data.address }}, {{ prop.node.data.city }}
              </div>
              <div class="text-caption text-secondary text-weight-bold">
                <q-icon name="event" /> {{ formatDateTime(prop.node.data.date_start) }}
              </div>
            </div>

            <div class="col-auto">
              <q-btn
                rounded
                color="primary"
                label="BOOK"
                size="sm"
                @click.stop="confirmAppointment(prop.node.data)"
              />
            </div>
          </div>
        </template>
      </q-tree>

      <div v-if="AppointmentTree.length === 0" class="text-center q-mt-xl text-grey">
        <q-icon name="event_busy" size="4em" />
        <p>No appointments found.</p>
        <q-btn flat color="primary" label="Back to Map" to="/base/map" />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { SessionStorage, date } from 'quasar'

const router = useRouter()
const AppointmentTree = ref([])
const isFiltered = ref(false) // Track if we are viewing a single clinic

// Create the tree on component mount
onMounted(() => {
  buildTree()
})

// Build the appointment tree
function buildTree(forceShowAll = false) {
  const BasicList = SessionStorage.getItem('arrayForMap') || []
  let idPracticeSelected = SessionStorage.getItem('idPractice')

  // If the user clicked "Show All", we ignore the ID
  if (forceShowAll) {
    idPracticeSelected = null
    SessionStorage.remove('idPractice') // Clean up storage
    isFiltered.value = false
  } else {
    // Check if we are filtering
    isFiltered.value = !!idPracticeSelected
  }

  // Filter slots if a practice ID is selected
  const FilteredSlots = idPracticeSelected
    ? BasicList.filter((s) => s.id == idPracticeSelected || s.id_clinic == idPracticeSelected)
    : BasicList

  // Reset tree before rebuilding
  AppointmentTree.value = []

  if (FilteredSlots.length === 0) return

  // Grouping logic (Practice -> Day -> Hour)
  const practiceGroups = {}

  FilteredSlots.forEach((slot) => {
    const practiceName = slot.clinic_name || 'Medical Practice'
    if (!practiceGroups[practiceName]) practiceGroups[practiceName] = []
    practiceGroups[practiceName].push(slot)
  })

  let idCounter = 0

  for (const [practiceName, slots] of Object.entries(practiceGroups)) {
    // Group by Day
    const dayGroups = {}
    slots.forEach((slot) => {
      const day = date.formatDate(slot.date_start, 'DD-MM-YYYY')
      if (!dayGroups[day]) dayGroups[day] = []
      dayGroups[day].push(slot)
    })

    const childrenDays = []

    for (const [dayStr, slotsDay] of Object.entries(dayGroups)) {
      // Create Hour Nodes (The Cards)
      const childrenHours = slotsDay.map((slot) => {
        return {
          id: ++idCounter,
          label: date.formatDate(slot.date_start, 'HH:mm'),
          header: 'card',
          data: slot,
        }
      })

      // Add Day Node
      childrenDays.push({
        id: ++idCounter,
        label: 'Date: ' + dayStr,
        icon: 'calendar_today',
        children: childrenHours,
      })
    }

    // Add Practice Node (Root)
    AppointmentTree.value.push({
      id: ++idCounter,
      label: practiceName,
      icon: 'business',
      children: childrenDays,
    })
  }
}

// Reset filter to show all clinics
function resetFilter() {
  buildTree(true) // Call buildTree with true to force show all
}

// Format date and time for display
function formatDateTime(isoString) {
  const day = date.formatDate(isoString, 'DD/MM/YYYY')
  const hour = date.formatDate(isoString, 'HH:mm')
  return `${day} at ${hour}`
}

// Booking action
function confirmAppointment(slot) {
  const bookingData = {
    id: slot.id,
    practice: slot.name,
    address: `${slot.address}, ${slot.city}`,
    doctor: `${slot.doctor_name} ${slot.doctor_surname}`,
    date: date.formatDate(slot.date_start, 'DD/MM/YYYY'),
    time: date.formatDate(slot.date_start, 'HH:mm'),
  }

  SessionStorage.set('selectedBooking', bookingData)
  router.push('/Scroll') // Ensure this route matches your routes.js
}
</script>

<style>
.q-tree__node-header-content {
  font-size: 16px;
}
</style>
