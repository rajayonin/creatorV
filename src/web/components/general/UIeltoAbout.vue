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
import CardAuthor from "./CardAuthor.vue"
// import dcamarmas from '@/web/assetsimg/author_dcamarmas.png'

export default {
  props: {
    id: { type: String, required: true },
  },
  components: { CardAuthor },
}
</script>

<template>
  <b-modal :id="id" title="About us" scrollable no-footer>
    <b-card-group>
      <CardAuthor
        author_img="@/web/assets/img/author_dcamarmas.png"
        author_alt="author_dcamarmas"
        author_full_name="Diego Camarmas Alonso"
        author_href_linked="https://www.linkedin.com/in/dcamarmas"
        author_href_rgate="https://www.researchgate.net/profile/Diego-Camarmas-Alonso"
        author_href_github="https://github.com/dcamarmas"
      />

      <CardAuthor
        author_img="@/web/assets/img/author_fgarcia.png"
        author_alt="author_fgarcia"
        author_full_name="Félix García Carballeira"
        author_href_linked="https://es.linkedin.com/in/f%C3%A9lix-garc%C3%ADa-carballeira-4ab48a14"
        author_href_rgate="https://www.researchgate.net/profile/Felix_Garcia-Carballeira"
        author_href_github=""
      />

      <CardAuthor
        author_img="@/web/assets/img/author_acaldero.png"
        author_alt="author_acaldero"
        author_full_name="Alejandro Calderón Mateos"
        author_href_linked="https://www.linkedin.com/in/alejandro-calderon-mateos/"
        author_href_rgate="https://www.researchgate.net/profile/Alejandro_Calderon2"
        author_href_github="https://github.com/acaldero"
      />

      <CardAuthor
        author_img="@/web/assets/img/author_edelpozo.png"
        author_alt="author_edelpozo"
        author_full_name="Elías del Pozo Puñal"
        author_href_linked="https://www.linkedin.com/in/edelpozop/"
        author_href_rgate="https://www.researchgate.net/profile/Elias-Del-Pozo-Punal-2"
        author_href_github="https://github.com/edelpozop"
      />
    </b-card-group>

    <b-list-group class="my-3">
      <b-list-group-item style="text-align: center">
        <a href="mailto: creator.arcos.inf.uc3m.es@gmail.com">
          <span class="fa-solid fa-envelope" />
          creator.arcos.inf.uc3m.es@gmail.com
        </a>
      </b-list-group-item>
    </b-list-group>

    <b-list-group>
      <b-list-group-item style="text-align: center">
        <b-row align-h="center">
          <b-col cols="4">
            <a target="_blank" href="https://www.arcos.inf.uc3m.es/">
              <img
                alt="ARCOS"
                class="p-0 headerLogo"
                src="@/web/assets/img/arcos.svg"
              />
            </a>
          </b-col>
          <b-col cols="8">
            <a target="_blank" href="https://www.inf.uc3m.es/">
              <img
                alt="Computer Science and Engineering Departament"
                class="p-0 headerLogo"
                src="@/web/assets/img/dptoinf.png"
                style="width: 90%; height: auto"
              />
            </a>
          </b-col>
        </b-row>
      </b-list-group-item>
    </b-list-group>
  </b-modal>
</template>
