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
import UIeltoToolbar from "./general/UIeltoToolbar.vue"
import TextareaAssembly from "./assembly/TextareaAssembly.vue"
import AssemblyError from "./assembly/AssemblyError.vue"
import Examples from "./assembly/Examples.vue"
import LoadAssembly from "./assembly/LoadAssembly.vue"
import DownloadPopup from "./general/DownloadModal.vue"
import MakeURI from "./assembly/MakeURI.vue"

export default {
  props: {
    browser: String,
    os: { type: String, required: true },
    arch_available: Array,
    architecture_name: String,
    assembly_code: String,
    modal_assembly_error: Object,
    vim_mode: { type: Boolean, required: true },
    vim_custom_keybinds: { type: Array, required: true },
    dark: { type: Boolean, required: true },
  },

  components: {
    UIeltoToolbar,
    TextareaAssembly,
    AssemblyError,
    Examples,
    LoadAssembly,
    DownloadPopup,
    MakeURI,
  },
}
</script>

<template>
  <b-container fluid align-h="center" id="assembly">
    <b-row>
      <b-col>
        <!-- Navbar -->
        <UIeltoToolbar
          id="navbar_assembly"
          components="btn_architecture,btn_simulator|btn_compile|dropdown_assembly_file,dropdown_library|btn_configuration,btn_information"
          :browser="browser"
          :os="os"
          :dark="dark"
          :arch_available="arch_available"
          :assembly_code="assembly_code"
          :show_instruction_help="true"
          ref="toolbar"
        />

        <!-- Assembly navbar modals -->

        <!-- Load assembly form -->
        <LoadAssembly id="load_assembly" />

        <!-- Save assembly form -->
        <DownloadPopup
          id="save_assembly"
          type="assembly"
          title="Save Assembly"
          default-filename="assembly"
          extension=".s"
          :fileData="this.$root.assembly_code"
        />

        <!-- Examples modal -->
        <Examples
          id="examples"
          :architecture_name="architecture_name"
          :compile="false"
        />

        <!-- Get uri -->
        <MakeURI
          id="make_uri"
          :architecture_name="architecture_name"
          :assembly_code="assembly_code"
        />

        <!-- Load binary form -->
        <!-- <LoadLibrary id="load_binary" /> -->

        <!-- Save binary form -->
        <!-- <SaveLibrary id="save_binary" /> -->

        <!-- <b-container fluid align-h="center" class="mx-0 px-0">
          <b-row cols="2">
            <b-col cols="12" id="divAssembly"> -->
        <!-- Assembly textarea-->
        <TextareaAssembly
          :os="os"
          :assembly_code="assembly_code"
          :vim_mode="vim_mode"
          :vim_custom_keybinds="vim_custom_keybinds"
          height="75vh"
          :dark="dark"
        />
        <!-- </b-col>

            <b-col cols="0" id="divTags" class="d-none"> -->
        <!-- Library tags-->
        <!-- <ListLibraryTags
                :instructions_tag="update_binary.instructions_tag"
              />
            </b-col>
          </b-row>
        </b-container> -->

        <!-- Compile error modal -->
        <AssemblyError
          id="modalAssemblyError"
          reff="errorAssembly"
          :modal_assembly_error="modal_assembly_error"
        />
      </b-col>
    </b-row>
  </b-container>
</template>
