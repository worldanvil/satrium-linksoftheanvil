import { Component, OnInit, Input, ViewChild, ElementRef, AfterViewInit, HostListener, ContentChild, TemplateRef } from '@angular/core';
import { GraphConfig } from '../graph.object';
import ForceGraph3D, { ForceGraph3DInstance } from '3d-force-graph';
import { Observable, Subscription } from 'rxjs';
import { GraphData, GraphNode, Visibility, LinkColorScheme, NodeColorScheme, GraphLink } from '../graph.model';
import distinctColors from 'distinct-colors';
import SpriteText from 'three-spritetext';
import { Sprite, Vector3 } from 'three';
import { GraphSidebarDirective } from './sidebar.directive';
import { FormControl } from '@angular/forms';
import { map, startWith } from 'rxjs/operators';


@Component({
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.sass']
})
export class GraphComponent implements OnInit, AfterViewInit {

  @ContentChild(GraphSidebarDirective) sidebarTemplate;
  @Input() config$: Observable<GraphConfig>;

  nodeColors = {};
  linkColors = {};

  displayNodeLegend = false;
  displayLinkLegend = false;

  private config: GraphConfig;
  private Graph: ForceGraph3DInstance;

  private data: GraphData;

  private configSubscription:Subscription;

  // highlights
  linksHighlighted = false;
  nodesHiglighted = false;
  nodeSelected = false;
  highlightLinks = new Set();
  highlightNodes = new Set();
  hoverNode = null;

  // search
  searchField = new FormControl();
  searchFilteredNodes: Observable<any[]>;
  

  @ViewChild("graph") graphContainer:ElementRef;

  constructor() { }

  ngOnInit(): void{
    
  }

  ngAfterViewInit(): void {
    this.Graph = ForceGraph3D({controlType: "orbit"})(this.graphContainer.nativeElement)
      .graphData({nodes:[], links:[]})
      .nodeVisibility(node => (<GraphNode>node).visibility != Visibility.HIDDEN)
      .linkVisibility(link => (<GraphLink>link).visibility != Visibility.HIDDEN)
      .nodeColor(node => this.nodesHiglighted && !this.highlightNodes.has(node)?"#808080":node["color"])
      .linkWidth((link:any) => this.getLinkWidth(link))
      .linkOpacity(0.8)
      .enableNodeDrag(false)
      .nodeThreeObjectExtend(true)
      .nodeVal(node => node["wordcount"] || 100)
      .nodeRelSize(0.75)
      .nodeThreeObject((node:any)=>{
        const obj = new SpriteText(node.name);
        obj.position.add(new Vector3(0, 8, 0));
        obj.textHeight = 3;        
        if(this.highlightNodes.has(node)){
          obj.textHeight *= 2;
          obj.backgroundColor = "#808080";
          obj.borderColor = "#808080"
          obj.color = "#ffffff"
        }else if(this.nodesHiglighted){
          obj.textHeight /= 2;
          obj.color = "#808080"
        }
        return obj;
      }).onNodeClick((node:any) => {
        this.focusNode(node);
      });
      (this.Graph.d3Force('link') as any).distance(link => link.group === "mention" ? 150: 40).d3Force('charge').strength(-120);
  }

  @Input()
  public set graphData(graphData:GraphData){
    console.log(graphData);
    if(this.configSubscription)this.configSubscription.unsubscribe();
    this.configSubscription = this.config$.subscribe(x =>{
      this.data = x.apply(graphData)
      console.log("Graph Update", x, graphData);
       // Get distinct groups for coloring
      this.generateColors(this.data.nodes, this.data.links, x.nodes.colorScheme, x.links.colorScheme);
      console.log("Colors", this.nodeColors, this.linkColors);
      this.data.nodes.forEach(node => node["color"] = this.nodeColors[x.nodes.colorScheme === NodeColorScheme.CLUSTER?node["cluster"]:node["group"]]?.hex())
      this.config = x;
      this.Graph.graphData({nodes: this.data.nodes.filter(x => x.visibility != Visibility.OFF), links: this.data.links.filter(x => x.visibility != Visibility.OFF)});
      this.Graph
        .dagMode(<any>x.dagMode?.toString() || null)
        .linkColor(link => this.config.links.colorScheme === LinkColorScheme.GROUP?this.linkColors[link["group"]].hex():
          (this.config.links.colorScheme === LinkColorScheme.SOURCE?link.source["color"]:link.target["color"])
        );
      this.searchFilteredNodes = this.searchField.valueChanges
      .pipe(
        startWith(''),
        map(value => typeof value === 'string' ? value : value.label),
        map(name => name ? this.data.nodes.filter(option => option.name.toLowerCase().includes(name.toLowerCase())).slice(0,20) : this.data.nodes.slice(0, 20))
      )
    });
  }
  
  focusNode(node){
    console.log(node);
    // Aim at node from outside it  
    const distance = 250;
    const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);    

    this.highlightLinks.clear();
    this.highlightNodes.clear();
    this.linksHighlighted = true;
    this.nodesHiglighted = true;
    this.nodeSelected = true;
    this.highlightNodes.add(node);
    node.neighbors?.forEach(link => this.highlightNodes.add(link));
    node.links?.forEach(link => this.highlightLinks.add(link));
    this.Graph.refresh();

    this.Graph.cameraPosition(
      { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
      node, // lookAt ({ x, y, z })
      3000  // ms transition duration
    );
  }

  focusNodeType(type){
    this.highlightLinks.clear();
    this.highlightNodes.clear();
    this.linksHighlighted = true;
    this.nodesHiglighted = true;
    this.nodeSelected = true;
    if(this.config.nodes.colorScheme === NodeColorScheme.CLUSTER){
      this.data.nodes.filter(x => x.cluster === type).forEach(node =>  this.highlightNodes.add(node));
      this.data.links.filter(x => this.highlightNodes.has(x.source)).forEach(link => this.highlightLinks.add(link));
    }else{
      this.data.nodes.filter(x => x.group === type).forEach(node =>  this.highlightNodes.add(node));
    }
    this.Graph.refresh();
  }

  focusLinkType(type){
    this.highlightLinks.clear();
    this.highlightNodes.clear();
    this.linksHighlighted = true;
    this.nodesHiglighted = true;
    this.nodeSelected = true;
    this.data.links.filter(x => x.group === type).forEach(link => {
      this.highlightNodes.add(link.source);
      this.highlightNodes.add(link.target);
      this.highlightLinks.add(link);
    })
    this.Graph.refresh();
  }


  @HostListener('window:keydown', ['$event'])
  doSomething($event) {
    console.log("Key press", $event)
    if($event.keyCode === 27){
      this.clearFocus();
    }
  }

  private clearFocus(){
    console.log("Clearing Focus", this.nodeSelected);
    if(this.nodeSelected){
      this.highlightLinks.clear();
      this.highlightNodes.clear();
      this.nodeSelected = false;
      this.linksHighlighted = false;
      this.nodesHiglighted = false;
      this.Graph.refresh();          
    }
  }

  private generateColors(nodes, links, nodeScheme:NodeColorScheme, linkScheme:LinkColorScheme){
    // Nodes
    let nodeGroups = new Set();    
    this.nodeColors = {}
    nodes.forEach(node => nodeGroups.add(nodeScheme === NodeColorScheme.GROUP?node["group"]:node["cluster"]));
    nodeGroups.delete(undefined);
    let colors = distinctColors({count: nodeGroups.size, chromaMin: 20, lightMin: 20});
    let counter = 0;
    nodeGroups.forEach((group:any) => {
      this.nodeColors[group] = colors[counter];
      counter++;
    });

    //Links
    let linkGroups = new Set();
    this.linkColors = {}
    links.forEach(link => linkGroups.add(link["group"]));
    linkGroups.delete(undefined);
    colors = distinctColors({count: linkGroups.size, chromaMin: 20, lightMin: 20});
    counter = 0;
    linkGroups.forEach((x:any) => {
      this.linkColors[x] = colors[counter];
      counter++;
    });
    
    console.log(nodeGroups, this.nodeColors, linkGroups, this.linkColors);
  }

  private getLinkWidth(link){
    var width = 1;
    if(this.linksHighlighted){
      if(this.highlightLinks.has(link)){
        width = 4;
      }else{
        width = 0.1;
      }
    }
    return width / (link.group === "mention"?2:1);
  }

  searchBarDisplay(node): string {
    return node && node.label ? node.label : '';
  }
}
