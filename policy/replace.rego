package main

import rego.v1

# A replaced table, queue or bucket comes back empty.
deny contains msg if {
	some rc in input.resource_changes
	"delete" in rc.change.actions
	"create" in rc.change.actions
	msg := sprintf("%s would be replaced, and a replaced table starts empty", [rc.address])
}
