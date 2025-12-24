import math 


#to fix a serialization error related to nodes properties being nan
def serialize_node(nd):
    nd = dict(nd)
    for k, v in nd.items():
        if isinstance(v, float) and math.isnan(v): nd[k] = None
    return nd


#to fix a serialization error related to relations properties being nan
def serialize_relation(rel):
    rel = dict(rel)
    for k, v in rel.items():
        if isinstance(v, float) and math.isnan(v): rel[k] = None
    return rel