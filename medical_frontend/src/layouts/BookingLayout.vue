<!-- // clear page  N-->

<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <div class="q-gutter-y-md">
        <q-tabs inline-label class="bg-primary text-white shadow-2">
          <q-route-tab icon="near_me" clickable v-ripple to="/base/Map" exact />

          <q-route-tab icon="list" clickable v-ripple to="/base/List" exact />

          <q-route-tab icon="filter_alt" clickable v-ripple to="/base/Filters" exact />
        </q-tabs>
      </div>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>
