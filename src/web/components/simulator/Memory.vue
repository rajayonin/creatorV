<!--
Copyright 2018-2025 Felix Garcia Carballeira, Diego Camarmas Alonso,
                    Alejandro Calderon Mateos, Luis Daniel Casais Mezquida

This file is part of CREATOR.

CREATOR is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

CREATOR is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with CREATOR.  If not, see <http://www.gnu.org/licenses/>.
-->

<script>
import MemoryTable from "./MemoryTable.vue"

import { track_stack_names } from "@/core/memory/stackTracker.mjs"
import { main_memory } from "@/core/core.mjs"

export default {
  props: {
    dark: { type: Boolean, required: true },
    selectedSegment: { type: String, required: true },
  },

  components: { MemoryTable },

  data() {
    return {
      main_memory,
      track_stack_names,
      mem_representation_options: main_memory
        .getMemorySegments()
        .keys()
        .toArray()
        .map(s => ({ text: s.charAt(0).toUpperCase() + s.slice(1), value: s })),
    }
  },

  computed: {
    // sync w/ root
    segment: {
      get() {
        return this.selectedSegment
      },
      set(value) {
        this.$root.memory_segment = value
      },
    },
  },
}
</script>

<template>
  <b-container fluid align-h="center" class="mx-0 my-3 px-2">
    <b-row cols-xl="2" cols-lg="1" cols-md="2" cols-sm="1" cols-xs="1" cols="1">
      <!-- uncomment this when kernel -->
      <!-- <b-row cols-xl="1" cols-lg="1" cols-md="1" cols-sm="1" cols-xs="1" cols="1"> -->
      <b-col align-h="center" class="px-2">
        <div class="border m-1 py-1 px-2">
          <b-badge
            :variant="dark ? 'dark' : 'light'"
            class="h6 border groupLabelling my-0"
          >
            Main memory segment
          </b-badge>
          <b-form-radio-group
            :class="{ 'w-100': true, 'mb-1': true, border: dark }"
            v-model="segment"
            :options="mem_representation_options"
            :button-variant="dark ? 'dark' : 'outline-secondary'"
            outline
            size="sm"
            buttons
          />
        </div>
      </b-col>

      <b-col></b-col>
    </b-row>

    <b-row cols="1">
      <b-col align-h="center" class="px-2">
        <MemoryTable
          class="my-2"
          ref="memory_table"
          :main_memory="main_memory"
          :segment="segment"
        />
      </b-col>
    </b-row>
  </b-container>
</template>
