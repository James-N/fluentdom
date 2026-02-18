import MethodExtension from '../model/internal/MethodExtension';
import { VElementTemplate, VComponentTemplate } from '../model/VTemplate';

import { setTemplateKVOption } from '../service/template';
import utility from '../service/utility';


//#region  built-in VTemplate extensions

// register common extension methods for VElementTemplate and VComponentTemplate
MethodExtension.extend(
    [VElementTemplate, VComponentTemplate],
    {
        /**
         * set `class` option
         * @returns {this}
         */
        class (clsOrSet, value) {
            if (utility.isStrictObj(clsOrSet)) {
                clsOrSet = utility.extend({}, clsOrSet);
            } else if (utility.isStr(clsOrSet) && utility.isFunc(value)) {
                clsOrSet = { [clsOrSet]: value };
            }

            this.options = utility.setOptionValue(this.options, ['class'], clsOrSet, false, true);
            return this;
        },

        /**
         * set `id` option
         * @returns {this}
         */
        id (id) {
            this.options = utility.setOptionValue(this.options, ['id'], id);
            return this;
        },

        /**
         * set `styles` option
         * @returns {this}
         */
        style (nameOrSet, value) {
            setTemplateKVOption(this, 'styles', nameOrSet, value);
            return this;
        },

        /**
         * set `attrs` option
         * @returns {this}
         */
        attr (nameOrSet, value) {
            setTemplateKVOption(this, 'attrs', nameOrSet, value);
            return this;
        },

        /**
         * set `props` option
         * @returns {this}
         */
        prop (nameOrSet, value) {
            setTemplateKVOption(this, 'props', nameOrSet, value);
            return this;
        },

        /**
         * register element event callback
         * @returns {this}
         */
        listen (nameOrSet, handle) {
            setTemplateKVOption(this, 'listeners', nameOrSet, handle, true);
            return this;
        }
    }
);

//#endregion