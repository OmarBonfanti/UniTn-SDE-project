<!-- // clear page  N-->

<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <div class="bg-white text-black">
        <q-toolbar>
          <div class="col text-left">
            <img height="100" alt="Project logo" src="icons/Logo.png" />
          </div>
          <div class="col text-right">
            <img height="100" alt="ATS logo" src="icons/ATS-trento.png" />
          </div>
        </q-toolbar>
      </div>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>
