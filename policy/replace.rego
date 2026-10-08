package main

import rego.v1

# A replaced table, queue or bucket comes back empty.
deny contains msg if {
	some rc in input.resource_changes
	"delete" in rc.change.actions
	"create" in rc.change.actions
	msg := sprintf("%s would be replaced, and a replaced table starts empty", [rc.address])
}

# The OIDC probe's input, set to this value, waits for an override.
deny contains msg if {
	some rc in input.resource_changes
	rc.type == "terraform_data"
	rc.change.after.input == "held-for-an-override"
	msg := sprintf("%s is held until someone policy.override lists lets it through", [rc.address])
}
