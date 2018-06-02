import RequestData, { IRequestParams } from "olympus-r/engine/net/RequestData";
import IRequestPolicy from "olympus-r/engine/net/IRequestPolicy";
import { trimData } from "olympus-r/utils/ObjectUtil";
$a-{if: protocol == "http"}
import policy from "olympus-r/engine/net/policies/HTTPRequestPolicy";
$a-{end if}
$a-{if: response != null}
import $a-{response.name}Response from "../response/$a-{response.name}Response";
$a-{end if}
$a-{for: name in getCustomNames(fields)}
import $a-{name} from "../type/$a-{name}";
$a-{end for}

/**
 * @author TemplateGenerator
 * @email initial_r@qq.com
 * 
 * $a-{comment}
*/
export default class $a-{name}Request extends RequestData
{
    $a-{for: field in fields}
    /**
     * $a-{field.comment}
     * 
     * @type { $a-{field.type.to} }
     * @memberof $a-{name}Request
     */
    $a-{if: field.type.class == "basic"}
    public $a-{field.name}: $a-{field.type.to};
    $a-{end if}
    $a-{if: field.type.class == "custom"}
    public $a-{field.name}: $a-{field.type.to} = new $a-{field.type.to}();
    $a-{end if}
    $a-{if: field.type.class == "array"}
    public $a-{field.name}: $a-{field.type.to} = [];
    $a-{end if}
    $a-{if: field.type.class == "map"}
    public $a-{field.name}: $a-{field.type.to} = {};
    $a-{end if}

    $a-{end for}
    private ___params: IRequestParams = {
        type: "$a-{name}",
        hostIndex: $a-{domainindex},
        path: "$a-{url}",
        protocol: "$a-{protocol}",
        method: "$a-{method}",
        $a-{if: response != null}
        response: $a-{response.name}Response,
        $a-{end if}
        headerDict: {
            $a-{if: method != "GET" && contentType != null && fields.length > 0}
            "Content-Type": "$a-{contentType}",
            $a-{end if}
        },
        data: {},
    };
    public get __params(): IRequestParams
    {
        $a-{for: field in fields}
        this.___params.data.$a-{field.name} = this.$a-{field.name}; // $a-{field.type.to} - $a-{field.comment}
        $a-{end for}
        trimData(this.___params.data);

        return this.___params;
    }
    public __policy: IRequestPolicy = policy;
}
