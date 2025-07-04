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
import { show_loading, hide_loading, show_notification } from "@/web/utils.mjs"
import { creator_ga } from "@/core/utils/creator_ga.mjs"

export default {
  props: {
    id: { type: String, required: true },
  },

  data() {
    return { file: null }
  },

  methods: {
    //Load new assembly code into text area
    loadAssembly() {
      show_loading()

      // read file
      const reader = new FileReader()
      reader.onload = event => {
        this.$root.assembly_code = event.currentTarget.result
        hide_loading()
        show_notification(
          " The selected program has been loaded correctly",
          "success",
        )
      }
      reader.onerror = () => show_notification("Error loading file", "danger")

      reader.readAsText(this.file)

      /* Google Analytics */
      creator_ga("assembly", "assembly.load", "assembly.load")
    },
  },
}
</script>

<template>
  <b-modal
    :id="id"
    title="Load Assembly"
    ok-title="Load from this File"
    @ok="loadAssembly"
  >
    <p>Please select the assembly file to be loaded</p>
    <b-form-file
      v-model="file"
      :state="file !== null"
      placeholder="Choose a file..."
      accept=".s"
      id="assembly_file"
    >
    </b-form-file>
  </b-modal>
</template>
