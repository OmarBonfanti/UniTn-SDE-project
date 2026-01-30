<template>
  <q-page>
    <div class="q-pa-md">
      <q-card class="my-card">
        <q-img src="icons/bookingDOC.png" />

        <q-card-section>
          <div class="text-h6">Experimental service for a network of outpatient clinics</div>
        </q-card-section>
      </q-card>
    </div>
    <div class="row justify-center q-pa-lg">
      <q-btn
        size="lg"
        aligne="around"
        class="btn-fixed-width"
        color="primary"
        label="Go to service"
        icon="lightbulb_outline"
        to="/Index"
      />
    </div>

    <q-card
      class="my-card text-black"
      style="background: radial-gradient(circle, #ffffff 0%, #eefeff 100%)"
    >
      <q-card-section>
        <div class="text-body1">
          The service allows booking of
          <b>occasional visits and services</b> in the schedules of GPs (MMG) active in the Province
          of Trento, for situations of illness or non-deferrable needs:
        </div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-list dense bordered padding class="rounded-borders text-body1">
          <q-item>
            <q-item-section avatar>
              <q-icon color="primary" size="1em" name="fiber_manual_record" />
            </q-item-section>
            <q-item-section> Issuance of pharmaceutical prescriptions </q-item-section>
          </q-item>
          <q-item>
            <q-item-section avatar>
              <q-icon color="primary" size="1em" name="fiber_manual_record" />
            </q-item-section>
            <q-item-section> richieste di visite specialistiche di approfondimento </q-item-section>
          </q-item>
          <q-item>
            <q-item-section avatar>
              <q-icon color="primary" size="1em" name="fiber_manual_record" />
            </q-item-section>
            <q-item-section> outpatient visits </q-item-section>
          </q-item>
          <q-item>
            <q-item-section avatar>
              <q-icon color="primary" size="1em" name="fiber_manual_record" />
            </q-item-section>
            <q-item-section> issuance of sick leave certificates </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
    <div class="row justify-center q-pa-sm"></div>
    <q-card class="my-card">
      <q-card-section>
        <div class="text-body1">
          The schedules visible in the app are updated in real time and ordered starting from the
          offices closest to you.
        </div>
      </q-card-section>
      <q-card-section>
        <div class="text-body1">
          Access is allowed only to patients who do not have a General Practitioner: if by entering
          the Tax Code you do not fall into this category, the procedure will be blocked.
        </div>
      </q-card-section>

      <q-card-section>
        <div class="text-body1 text-bold">
          Note: The texts, data related to the participating facilities (logos and names), the
          identities and locations of doctors, and other displayed information are fictitious,
          generated through Artificial Intelligence models (LLM) for purely demonstrative purposes.
        </div>
      </q-card-section>
    </q-card>
    <div class="row justify-center q-pa-lg">
      <q-btn
        size="lg"
        aligne="around"
        class="btn-fixed-width"
        color="primary"
        label="Go to service"
        icon="lightbulb_outline"
        to="/Index"
      />
    </div>
  </q-page>
</template>

<style>
div.a {
  max-width: 90%;
  padding-left: 10px;
  padding-top: 20px;
}
q-input.m {
  max-width: min-content;
}
</style>
