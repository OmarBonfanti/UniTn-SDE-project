<template>
  <q-page class="flex column flex-center bg-grey-1 text-center q-pa-md">
    <q-space />

    <div class="full-width" style="max-width: 100%">
      <q-card class="my-card shadow-10 q-pa-md" style="border-radius: 16px">
        <div class="row justify-center q-mb-md">
          <q-img src="icons/Logo.png" style="width: 100%; max-width: 100%" fit="contain" />
        </div>

        <q-card-section>
          <div class="text-h4 text-primary text-weight-bold q-mb-md">Booking confirmed!</div>

          <q-separator class="q-my-md" />

          <div class="text-subtitle1 q-mb-sm">Thank you for using our service.</div>
          <div class="text-body2 text-grey-7 bg-grey-2 q-pa-sm rounded-borders">
            <q-icon name="mail" size="xs" />
            We have sent you a summary email with all the appointment details.
          </div>
        </q-card-section>
      </q-card>

      <div class="q-mt-xl">
        <q-btn
          push
          size="lg"
          color="primary"
          text-color="white"
          label="Return to Homepage"
          icon="home"
          to="/"
          class="full-width"
          style="max-width: 300px; border-radius: 50px"
        />
      </div>
    </div>

    <q-space />
  </q-page>
</template>

<style scoped>
.my-card {
  animation: slideIn 0.5s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
