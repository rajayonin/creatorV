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
import available_arch from "/architecture/available_arch.json"
import { architecture } from "@/core/core.mjs"

export default {
  props: {
    id: { type: String, required: true },
    architecture_name: { type: String, required: true },
    instruction_help_size: { type: Number, required: true },
  },

  data() {
    return {
      //Help Filter
      instHelpFilter: null,

      //Help table
      insHelpFields: ["name"],

      instructions: architecture.instructions,
    }
  },

  computed: {
    width() {
      return this.instruction_help_size + "vw"
    },

    architecture_guide() {
      return available_arch.find(
        arch =>
          arch.name === this.architecture_name ||
          arch.alias.includes(this.architecture_name),
      )?.guide
    },
  },
}
</script>

<template>
  <b-offcanvas :id="id" placement="end" :width="width" title="Instruction Help">
    <b-form-input
      id="filter-input"
      v-model="instHelpFilter"
      type="search"
      placeholder="Search instruction"
      size="sm"
    />

    <br />
    <a v-if="architecture_guide" target="_blank" :href="architecture_guide">
      <font-awesome-icon :icon="['fas', 'file-pdf']" />
      {{ architecture_name }} Guide
    </a>
    <br />

    <b-table
      small
      :items="instructions"
      :fields="insHelpFields"
      class="text-left my-3"
      :filter="instHelpFilter"
      thead-class="d-none"
      primary-key="name"
    >
      <template v-slot:cell(name)="row">
        <h4>{{ row.item.name }}</h4>
        <em>{{ row.item.signatureRaw }}</em>
        <br />
        {{ row.item.help }}
      </template>
    </b-table>
  </b-offcanvas>
</template>

<style lang="scss" scoped>
.help-scroll-y {
  display: block;
  max-height: 80vh;
  overflow-y: auto;
  -ms-overflow-style: -ms-autohiding-scrollbar;
}
</style>
